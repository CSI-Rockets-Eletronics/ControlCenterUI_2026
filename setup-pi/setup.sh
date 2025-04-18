#!/bin/bash -i

set -e

SETUP_FILES_DIR=$(realpath "$(dirname "$0")")
REPO_DIR=$(realpath "$(dirname "$0")/..")

# Install bun
curl -fsSL https://bun.sh/install | bash
source ~/.bashrc

# Install dependencies
cd "$REPO_DIR"
bun install

# Copy the service file to the systemd services folder
cd "$SETUP_FILES_DIR"
sudo cp control-center-ui.service /etc/systemd/system/

# Reload systemd daemon to read the new service file
sudo systemctl daemon-reload

# Enable the service to run on boot
sudo systemctl enable control-center-ui.service

# Start the service
sudo systemctl restart control-center-ui.service
