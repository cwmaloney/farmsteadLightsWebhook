#! /bin/bash
set -x

cd /projects/farmsteadLightsWebhook
/Applications/ngrok http -config ngrokDev.yml 8000
