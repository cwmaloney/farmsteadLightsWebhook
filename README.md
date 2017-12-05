# Farmstead Lights Webhook

This is a the web hook for the Holiday Lights Dialogflow chatbot.

### References:

* [https://developers.google.com/actions/get-started/](https://developers.google.com/actions/get-started/)
* [https://developers.google.com/actions/](https://developers.google.com/actions/)

# Setup

## Get Project Code from GitHub
1. Recommended - Go to GitHub and create an account so you can post comments,
send pull requests, etc. for the project.
1. Suggestion - Ask the project committers to make you a committer for the project.
1. Go to <https://github.com/cwmaloney/farmsteadLightsWebhook>
1. Clone or download the source (suggestion /projects/farmsteadLightsWebhook).
1. Recommended - Clone instead of dowload.
Cloning creates a local git repository for you with the history of the project.
This also allows you to commit, changes to your lcal repository (for checkpointing changes)
before pushing changes to the server.
   * Click "Clone or download"
   * Click "Open in Desktop" (This will use GitHub Desktop... a UI for git)
   * If you do not have GitHub Desktop installed, install it when prompted
1. Recommended - Install git command line tools
   * https://git-scm.com

## Install Node.js and NPM
Node.js is a JavaScript runtime system for building applications.
This project (like many other projects) uses it to create an HTTP server.  
1. Go to <https://nodejs.org/en/>
2. Download LTS or current version (8.4) for Windows or Mac
3. Run the installer; accept the defaults
4. To verify installation, in a terminal/command window, type: node -v and then npm -v

## Install Visual Studio Code (VS Code)
This project does not require VS Code or any IDE.
Most programmers will find an IDE is very helpful.
VS Code is free and I used it here to gain experience.
1. Go to <https://code.visualstudio.com/>
2. Download the Windows or Mac version - latest stable build
3. For Mac:
   * Unzip the installer and copy the app into your Applications folder
3. For Windows:
   * Run the exe.
   * Restart your computer (to fix path environment variable - per the instructions).
4. To verify installation, launch and close the app
5. ~~Add Extensions to VS Code; On the left navigation pane (Activity bar), click the Extensions icon. Install these extensions:~~
     * ~~npm~~ 

## Install ngrok
Ngrok provides proxy and reverser proxy for servers that do not have public endpoints.
1. Go to <https://ngrok.com>
2. Download the Windows or Mac version
3. For Mac:
   * Unzip the installer and copy the app into your Applications Folder
   * cd /usr/local/bin
   * sudo su -
   * ln -s /Applications/ngrok ngrok (I can't get this to work - permissions? I am using /Applicaitons/ngrok)
4. For Windows:
   * Unzip the and put it in a folder referenced by our PATH environment variable - or -
   * Recommended: create C:\Program Files\ngrok; copy ngroke.exe to the folder; add the folder to system PATH environment variable
5. <https://ngrok.com/docs/2> is very helpful.
6. To verify installation, start a new terminal/command window, run: ngrok version

## Install npm packages
The npm (node package manager) will install the JavaScript packages (libraries) the project needs including:
  * Express library (simple web framework)

npm installs packages in the folder "node_modules" withing the project folder.

1. Install:
     * Open a terminal or command line window
     * "cd" to project folder
     * npm install

## Running the web hook server
1. Optional - Update the software from github.com
    * Open a terminal or command line window
    * cd to project folder
    * git pull
2. Start the service
    * Open a terminal or command line window
    * cd to project folder
    * node webHooks.js
3. Start ngrok
    * Open a terminal or command line window
    * First timed you run ngrok on the server: ngrok authtoken <auth token from ngrok UI>
    * ngrok http 8000 -subdomain=farmsteadlights
4. Test the service
    * Open status page in a browser https://farmsteadlights.ngrok.io/status
    * Open farmstead.com - try "Go Santa"

## Editing and Debugging using VS Code
1. In VS Code, open the project folder (File/Open)
1. On the left navigation pane (Activity bar), click the debug icon
1. Click the green arrow icon in the debug view to start the service and attach the debugger


## Setup a Twilio Account
We can use Twilio to send/recieve SMS messages.
1. Create a Twilio account.
1. Lease (buy) a phone number that supports SMS. You choose by area code or other digits.
1. If using a trial account, verify the phones you will use during testing.

