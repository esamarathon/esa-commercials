# esa-commercials

**This bundle should only be used if you were directed here to specifically use it.**

> NodeCG bundle used alongside `nodecg-speedcontrol` to run Twitch commercials for events on the ESAMarathon channel.

*This is a bundle for [NodeCG](https://nodecg.dev); if you do not understand what that is, we advise you read their website first for more information.*


## Installation

This is a [NodeCG](https://nodecg.dev) v1.8.1 bundle. You will need to have NodeCG v1.8.1 or above installed to run it. It also requires you to install the [nodecg-speedcontrol](https://github.com/speedcontrol/nodecg-speedcontrol) bundle (at least v2.4.0).

This bundle relies on the [obs-websocket](https://github.com/Palakis/obs-websocket) plugin (tested with v4.9.1) to detect scene changes, so make sure you have this installed (custom address/port and password can be specified in the bundle's config if needed). The OBS functionality can be disabled but in most cases is important!

Install this bundle just like any other NodeCG bundle; if you have `nodecg-cli` you can:
- Use `nodecg install esamarathon/esa-commercials`, then...
- Do `nodecg defaultconfig esa-commercials` to generate a default configuration file.

If not obvious, you must be logged into/authorised with Twitch in the `nodecg-speedcontrol` bundle for commercials to be able to be ran **(even if using the external server option)**.

## Configuration

```json
{
  "thisEvent": 1,
  "obs": {
    "enabled": true,
    "address": "localhost:4455",
    "password": "",
    "nonRunCommercialTriggerScene": "Intermission (commercials)",
    "nonRunCommercialScenes": [
      "Intermission Player",
      "Intermission",
      "Intermission (commercials)"
    ]
  },
  "server": {
    "enabled": false,
    "address": "ADDRESS",
    "token": "TOKEN",
    "channels": [
      "esamarathon"
    ]
  }
}
```

- `thisEvent`: Only change this number if you are asked to; changes internal logic.
- `obs`: Settings related to the OBS WebSocket connection.
  - `enabled`: If the OBS required functionality should be enabled or not. Usually you want this enabled unless told otherwise.
  - `address`: Address of OBS WebSocket instance, in the pattern `hostname:port`. Does not need changing if using defaults and running locally.
  - `password`: Password used for securing the OBS WebSocket instance, if you have set this.
  - `nonRunCommercialTriggerScene`: Name of the scene which will start the internal logic for "non-run" commercials; this is case sensitive and matches the start of the string, so more characters can be added after in your scene name in OBS if needed.
  - `nonRunCommercialScenes`: Names of the scenes which count as part of your "non-run" scenes, intermission scenes usually; these are scenes that commercials will play on when a run is currently not happening. Similar to above, these are case sensitive and match the start of the string. **Make sure you add every possible scene that may be used during non-run time!**
- `server`: Settings related to using our external server to run commercials. Should only be used if you are requested to. We will supply all the information if needed. **This requires you to set the `twitch.commercialsUseExternal` setting to `true` in the `nodecg-speedcontrol` bundle configuration; [see the README](https://github.com/speedcontrol/nodecg-speedcontrol/blob/master/READMES/Configuration.md#twitch).**
  - `enabled`: If this functionality should be enabled.
  - `address`: Address of the server.
  - `token` Authorisation token used for the server, it must have these scopes: `authorised-channels:channels:read`, `commercials:logs:read`, `commercials:start`.
  - `channels`: Array of channel names for commercials to be ran on.


## Usage

Commercials will automatically be triggered when needed, including when switched to the non-run commercial trigger scene in OBS, by default the scene must start with "Intermission (commercials)" but this can be changed in the configuration file (see above).

There is also a dashboard button to disable running commercials for the rest of a run, useful if the run is planned to go highly under estimate, and a dashboard toggle to disable the actual commercial "running" logic; all other logic will still actually happen, but no commercials will be triggered, useful for testing.
