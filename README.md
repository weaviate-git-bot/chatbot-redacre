# Chat Bot Application

Welcome to the Chat Bot Application! This is a React-based chat bot that utilizes Weaviate for natural language processing, Firebase for real-time data storage and authentication, Firebase Functions for serverless backend logic, Firebase Firestore for NoSQL database, and Docker for easy deployment and containerization.


[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)
![GitHub stars](https://img.shields.io/github/stars/yourusername/chat-bot-application?style=social)

<h1>Weaviate <img alt='Weaviate logo' src='https://weaviate.io/img/site/weaviate-logo-light.png' width='100' align='right' /></h1>

![Weaviate Version](https://img.shields.io/github/release/semi-technologies/weaviate.svg)
![Weaviate Stars](https://img.shields.io/github/stars/semi-technologies/weaviate.svg)
![License](https://img.shields.io/badge/License-Apache%202.0-blue.svg)


<h1>Firebase <img alt='Firebase logo' src='https://avatars.githubusercontent.com/u/1335026' width='100' align='right' /></h1>

![Firebase Hosting](https://img.shields.io/badge/Firebase-Hosting-orange)
![Firebase Realtime Database](https://img.shields.io/badge/Firebase-Realtime%20Database-orange)
![Firebase Authentication](https://img.shields.io/badge/Firebase-Authentication-orange)
![Firebase Firestore](https://img.shields.io/badge/Firebase-Firestore-orange)
![Firebase Functions](https://img.shields.io/badge/Firebase-Functions-orange)


<h1>React <img alt='React logo' src='https://th.bing.com/th/id/R.f81a6f373c244b1f70f4b7402b5ab372?rik=rbXh4ieLuKt%2bmA&riu=http%3a%2f%2flogos-download.com%2fwp-content%2fuploads%2f2016%2f09%2fReact_logo_logotype_emblem.png&ehk=QhGOkKcUKCU7FBQgHOajOiJqJBACUTD2Ni6LsfqzCEA%3d&risl=&pid=ImgRaw&r=0' width='100' align='right' /></h1>

[![GitHub license](https://img.shields.io/badge/license-MIT-blue.svg)](https://github.com/facebook/react/blob/main/LICENSE) [![npm version](https://img.shields.io/npm/v/react.svg?style=flat)](https://www.npmjs.com/package/react) [![CircleCI Status](https://circleci.com/gh/facebook/react.svg?style=shield)](https://circleci.com/gh/facebook/react) [![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](https://reactjs.org/docs/how-to-contribute.html#your-first-pull-request)



<h1>Docker <img alt='Docker logo' src='https://iconape.com/wp-content/files/fr/370801/svg/docker-icon-logo-icon-png-svg.png' width='100' align='right' /></h1>

[![GitHub release](https://img.shields.io/github/release/docker/compose.svg?style=flat-square)](https://github.com/docker/compose/releases/latest)
[![PkgGoDev](https://img.shields.io/badge/go.dev-docs-007d9c?style=flat-square&logo=go&logoColor=white)](https://pkg.go.dev/github.com/docker/compose/v2)


## Table of Contents

- [Introduction](#introduction)
- [Usage](#usage)
- [Features](#features)
- [Prerequisites](#prerequisites)
- [Installation](#installation)


## Introduction

The technology used for this application lead me to create a demo so it can be easy to check and test, yet I have included the Docker compose file to setup the local weaviate server.
No .env file was used and all environment variables are in:

- app/src/App.tsx - These are client side creadentials already setup.
- serverless/functions/src/index.ts - These are sensitive, and ommited from github, as thez can be from hosted services or local.

## Usage

Find the hosted demo here: [Insert Demo Link].

After logging in, a small drawer will appear at the bottom-right corner of the screen. Clicking on it will open a Chatroom with the bot.

The questions used are provided in the root directory under the name "faqs.json."

I used two approaches here as I was experimenting and having fun with them:

- HuggingFace
- OpenAI (Selected & Configured by default)

HuggingFace is free, but for the scope of this implementation, it can only retrieve the most relevant FAQ based on user input.

For the 7th point in the requirements, OpenAI comes into play, as it allows me to generate other responses within the same scope or discard the question if it's not relevant.

There's a menu button at the top of the Chatroom; clicking on it allows you to switch between the two approaches. If you would like to see the difference, feel free to try it out.

NOTE: Every time you switch, all data will be wiped, and the FAQs will be fetched again and vectorized, making it easy to add questions.

## Features

- Real-time chat with the bot
- Seamless integration of Weaviate NLP for improved bot responses
- User authentication using Firebase Authentication
- Chat history storage with Firebase Firestore
- Docker containerization for simple deployment

## Prerequisites

Before setting up the Chat Bot Application, make sure you have the following prerequisites installed:

- Node.js (v14.0.0 or later)
- npm (v6.0.0 or later)
- Docker (v20.0.0 or later)
- Weaviate API key (Sign up for free at https://www.semi.technology/developers/weaviate/current/), or run the local server.

## Installation

### Full

Follow these steps to set up the Chat Bot Application on your local machine:

```bash
git clone https://github.com/Brahim-Benzarti/chatbot-redacre.git

cd chatbot-redacre

docker-compose up
```

## Partial

Change directory to app

```bash
cd app
```

Build and tag the Docker image:

```bash
docker build -t chatbot:dev .
```

After the build is done spin up the container.

```bash
docker run \
  -it \
  --rm \
  -p 3001:3000 \
  -e CHOKIDAR_USEPOLLING=true \
  chatbot:dev
```

Navigate to http://localhost:3001/