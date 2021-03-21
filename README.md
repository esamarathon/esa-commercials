# esa-commercials

**This bundle should only be used if you were directed here to specifically use it.**

> NodeCG bundle used alongside `nodecg-speedcontrol` to run Twitch commercials for events on the ESAMarathon channel.

*This is a bundle for [NodeCG](https://nodecg.com/); if you do not understand what that is, we advise you read their website first for more information.*


## Installation

This is a [NodeCG](https://nodecg.com) v1.8.1 bundle. You will need to have NodeCG v1.8.1 or above installed to run it. It also requires you to install the [nodecg-speedcontrol](https://github.com/speedcontrol/nodecg-speedcontrol) bundle (at least v2.2.0).

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
    "nonRunCommercialTriggerScene": "Intermission (commercials)",
    "nonRunCommercialScenes": [
      "Video Player",
      "Intermission",
      "Intermission (commercials)"
    ]
  }
}
```

- `thisEvent`: Only change this number if you are asked to; changes internal logic.
- `obs`: Settings related to the OBS WebSocket connection.
  - `address`: Address of OBS WebSocket instance, in the pattern `hostname:port`. Does not need changing if using defaults and running locally.
  - `password`: Password used for securing the OBS WebSocket instance, if you have set this.
  - `nonRunCommercialTriggerScene`: Name of the scene which will start the internal logic for "non-run" commercials; this is case sensitive and matches the start of the string, so more characters can be added after in your scene name in OBS if needed.
  - `nonRunCommercialScenes`: Names of the scenes which count as part of your "non-run" scenes, intermission scenes usually; these are scenes that commercials will play on when a run is currently not happening. Similar to above, these are case sensitive and match the start of the string. **Make sure you add every possible scene that may be used during non-run time!**


## Usage

Commercials will automatically be triggered when needed, including when switched to the non-run commercial trigger scene in OBS, by default the scene must start with "Intermission (commercials)" but this can be changed in the configuration file (see above).

There is also a dashboard button to disable running commercials for the rest of a run, useful if the run is planned to go highly under estimate.
