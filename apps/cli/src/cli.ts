import * as Args from "@effect/cli/Args";
import * as Command from "@effect/cli/Command";
import * as Options from "@effect/cli/Options";
import * as Option from "effect/Option";
import {
  runDeviceCreate,
  runDeviceList,
  runDeviceUse,
  runList,
  runLogin,
  runLogout,
  runPull,
  runPush,
} from "./programs.js";

const deviceOption = Options.text("device").pipe(
  Options.withAlias("d"),
  Options.withDescription("Device to target (overrides the configured default)"),
  Options.optional,
);

const usernameOption = Options.text("username").pipe(
  Options.withAlias("u"),
  Options.withDescription("Username of the account (defaults to the signed in user)"),
  Options.optional,
);

const nameOption = Options.text("name").pipe(
  Options.withAlias("n"),
  Options.withDescription("Custom Islet name (derived from the path when omitted)"),
  Options.optional,
);

const pathOption = Options.text("path").pipe(
  Options.withAlias("p"),
  Options.withDescription("Path to write pulled files into"),
  Options.optional,
);

const visibilityOption = Options.choice("visibility", ["public", "private"]).pipe(
  Options.withAlias("v"),
  Options.withDescription("Whether the islet or device is visible to others (public or private)"),
  Options.optional,
);

const forceOption = Options.boolean("force").pipe(
  Options.withAlias("f"),
  Options.withDescription("Replace files that already exist locally"),
);

const absoluteOption = Options.boolean("absolute").pipe(
  Options.withAlias("a"),
  Options.withDescription("Store file paths as absolute instead of relative"),
);

const messageOption = Options.text("message").pipe(
  Options.withAlias("m"),
  Options.withDescription("Message describing this islet version"),
  Options.optional,
);

const versionOption = Options.text("version").pipe(
  Options.withAlias("v"),
  Options.withDescription("Version of the islet"),
  Options.optional,
);

const loginCommand = Command.make("login", {}, () => runLogin()).pipe(
  Command.withDescription("Sign in to your Dotlet account"),
);

const logoutCommand = Command.make("logout", {}, () => runLogout()).pipe(
  Command.withDescription("Log out of your Dotlet account"),
);

const pushCommand = Command.make(
  "push",
  {
    path: Args.text({ name: "path" }).pipe(Args.withDescription("File or directory to push")),
    device: deviceOption,
    name: nameOption,
    absolute: absoluteOption,
    message: messageOption,
    visibility: visibilityOption,
  },
  ({ path, device, name, absolute, message, visibility }) =>
    runPush({
      path,
      device: Option.getOrUndefined(device),
      name: Option.getOrUndefined(name),
      absolute,
      message: Option.getOrUndefined(message),
      visibility: Option.getOrUndefined(visibility),
    }),
).pipe(Command.withDescription("Push a file or directory as an islet"));

const pullCommand = Command.make(
  "pull",
  {
    name: Args.text({ name: "islet" }).pipe(Args.withDescription("Name of the islet to pull")),
    force: forceOption,
    path: pathOption,
    device: deviceOption,
    version: versionOption,
  },
  ({ name, force, path, device, version }) =>
    runPull({
      name,
      force,
      path: Option.getOrUndefined(path),
      device: Option.getOrUndefined(device),
      version: Option.getOrUndefined(version),
    }),
).pipe(Command.withDescription("Pull an islet"));

const listCommand = Command.make(
  "list",
  {
    device: deviceOption,
  },
  ({ device }) =>
    runList({
      device: Option.getOrUndefined(device),
    }),
).pipe(Command.withDescription("List islets for the selected or specified device"));

const deviceListCommand = Command.make(
  "list",
  {
    username: usernameOption,
  },
  ({ username }) =>
    runDeviceList({
      username: Option.getOrUndefined(username),
    }),
).pipe(Command.withDescription("List all the devices"));

const deviceCreateCommand = Command.make(
  "create",
  {
    name: Args.text({ name: "device name" }).pipe(Args.withDescription("Name of the new device")),
    visibility: visibilityOption,
  },
  ({ name, visibility }) =>
    runDeviceCreate({
      name,
      visibility: Option.getOrUndefined(visibility),
    }),
).pipe(Command.withDescription("Register a new device"));

const deviceUseCommand = Command.make(
  "use",
  {
    name: Args.text({ name: "device name" }).pipe(
      Args.withDescription("Name of the device to set as default"),
    ),
  },
  ({ name }) => runDeviceUse({ name }),
).pipe(Command.withDescription("Set current device"));

const deviceCommand = Command.make(
  "device",
  {
    username: usernameOption,
  },
  ({ username }) =>
    runDeviceList({
      username: Option.getOrUndefined(username),
    }),
).pipe(
  Command.withDescription("Manage devices: list, create, or choose a default"),
  Command.withSubcommands([deviceListCommand, deviceCreateCommand, deviceUseCommand]),
);

export const rootCommand = Command.make("dotlet", {}, () => runList({})).pipe(
  Command.withDescription("Sync and version dotfiles (islets)"),
  Command.withSubcommands([
    loginCommand,
    logoutCommand,
    pushCommand,
    pullCommand,
    listCommand,
    deviceCommand,
  ]),
);
