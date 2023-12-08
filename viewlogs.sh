#!/bin/bash
sudo journalctl -u emailservice.service --since "10 minutes ago"
