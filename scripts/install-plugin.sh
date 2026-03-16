#!/usr/bin/env bash
#
# Install agent-stack plugin for local Cursor testing.
# Based on: https://medium.com/@v.tajzich/how-to-write-and-test-cursor-plugins-locally
#
# Run from agent-stack repo root:
#   bash scripts/install-plugin.sh
#
# Then restart Cursor. Commands, skills, and agents should appear.
#

set -euo pipefail

command -v python3 >/dev/null 2>&1 || { echo "python3 required"; exit 1; }

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
PLUGIN_NAME="agent-stack"
PLUGIN_ID="${PLUGIN_NAME}@local"
TARGET="$HOME/.cursor/plugins/$PLUGIN_NAME"
CLAUDE_PLUGINS="$HOME/.claude/plugins/installed_plugins.json"
CLAUDE_SETTINGS="$HOME/.claude/settings.json"

echo "Installing $PLUGIN_NAME to $TARGET"

# 1. Copy plugin files (manifest + src; skip references)
rm -rf "$TARGET"
mkdir -p "$TARGET"
cp -R "$REPO_ROOT/.cursor-plugin" "$TARGET/"
cp -R "$REPO_ROOT/src" "$TARGET/"

# 2. Register in installed_plugins.json (upsert, don't clobber)
python3 - "$CLAUDE_PLUGINS" "$PLUGIN_ID" "$TARGET" <<'PY'
import json, os, sys
path, pid, ipath = sys.argv[1], sys.argv[2], os.path.abspath(sys.argv[3])
data = {}
if os.path.exists(path):
    try:
        data = json.load(open(path))
    except Exception:
        data = {}
plugins = data.get("plugins", {})
entries = [e for e in plugins.get(pid, [])
           if not (isinstance(e, dict) and e.get("scope") == "user")]
entries.insert(0, {"scope": "user", "installPath": ipath})
plugins[pid] = entries
data["plugins"] = plugins
os.makedirs(os.path.dirname(path), exist_ok=True)
json.dump(data, open(path, "w"), indent=2)
PY

# 3. Enable in settings.json (upsert, don't clobber)
python3 - "$CLAUDE_SETTINGS" "$PLUGIN_ID" <<'PY'
import json, os, sys
path, pid = sys.argv[1], sys.argv[2]
data = {}
if os.path.exists(path):
    try:
        data = json.load(open(path))
    except Exception:
        data = {}
data.setdefault("enabledPlugins", {})[pid] = True
os.makedirs(os.path.dirname(path), exist_ok=True)
json.dump(data, open(path, "w"), indent=2)
PY

echo ""
echo "Done. Installed to $TARGET"
echo "Registered: $CLAUDE_PLUGINS"
echo "Enabled: $CLAUDE_SETTINGS"
echo ""
echo "Next: Restart Cursor (or Cmd+Shift+P → Reload Window)."
echo "If commands/skills don't appear: enable 'Include third-party Plugins, Skills, and other configs' in Settings → Features."
echo ""
