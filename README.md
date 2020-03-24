# esa-commercials

**This bundle should only be used if you were directed here to specifically use it.**

> NodeCG bundle used alongside `nodecg-speedcontrol` to run Twitch commercials for events on the ESAMarathon channel.

*This is a bundle for [NodeCG](https://nodecg.com/); if you do not understand what that is, we advise you read their website first for more information.*


## Installation

This is a [NodeCG](https://nodecg.com) v1.6.0 bundle. You will need to have NodeCG v1.6.0 or above installed to run it. It also requires you to install the [nodecg-speedcontrol](https://github.com/speedcontrol/nodecg-speedcontrol) bundle (at least v2.0.0).

This bundle relies on the [obs-websocket](https://github.com/Palakis/obs-websocket) plugin to detect scene changes, so make sure you have this installed (custom address/port and password can be specified in the bundle's config if needed).

Install this bundle just like any other NodeCG bundle; if you have `nodecg-cli` you can:
- Use `nodecg install esamarathon/esa-commercials`, then...
- Do `nodecg defaultconfig esa-commercials` to generate a default configuration file.

If not obvious, you must be logged into/authorised with Twitch in the `nodecg-speedcontrol` bundle for commercials to be able to be ran.

## Configuration

```json
{
  "thisEvent": 1,
  "obs": {
    "address": "localhost:4444",
    "password": "",
    "intermissionScene": "Intermission"
  }
}
```

- `thisEvent`: Only change this number if you are asked to; changes internal logic.
- `obs`: Settings related to the OBS WebSocket connection.
  - `address`: Address of OBS WebSocket instance, in the pattern `hostname:port`. Does not need changing if using defaults and running locally.
  - `password`: Password used for securing the OBS WebSocket instance, if you have set this.
  - `intermissionScene`: Name of the scene where commercials will be played when switched to; this is case sensitive and matches the start of the string, so more characters can be added after in your scene name in OBS if needed.


## Usage

Commercials will automatically be triggered when needed, including when switched to the intermission scene in OBS, by default the scene must start with "Intermission" but this can be changed in the configuration file (see above).
