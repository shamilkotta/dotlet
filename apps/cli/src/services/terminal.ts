import process from "node:process";
import boxen from "boxen";
import chalk from "chalk";
import logSymbols from "log-symbols";
import ora, { type Ora } from "ora";
import * as Context from "effect/Context";
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";

export interface Terminal {
  readonly log: (message?: string) => Effect.Effect<void>;
  readonly error: (message: string) => Effect.Effect<void>;
  readonly warn: (message: string) => Effect.Effect<void>;
  readonly success: (message: string) => Effect.Effect<void>;
  readonly info: (message: string) => Effect.Effect<void>;
  readonly muted: (message: string) => Effect.Effect<void>;
  readonly startSpinner: (message: string) => Effect.Effect<void>;
  readonly updateSpinner: (message: string) => Effect.Effect<void>;
  readonly succeedSpinner: (message?: string) => Effect.Effect<void>;
  readonly failSpinner: (message?: string) => Effect.Effect<void>;
  readonly warnSpinner: (message?: string) => Effect.Effect<void>;
  readonly stopSpinner: Effect.Effect<void>;
  readonly box: (content: string, options?: { title?: string }) => Effect.Effect<void>;
}

export const Terminal = Context.GenericTag<Terminal>("@dotlet/Terminal");

let activeSpinner: Ora | undefined;
let spinnerStartedAt: number | undefined;

function stopActiveSpinnerUnsafe() {
  if (activeSpinner) {
    activeSpinner.stop();
    activeSpinner = undefined;
    spinnerStartedAt = undefined;
  }
}

function formatElapsedSuffix(): string {
  if (spinnerStartedAt === undefined) {
    return "";
  }
  const ms = Date.now() - spinnerStartedAt;
  return chalk.gray(`  ${(ms / 1000).toFixed(1)}s`);
}

export const TerminalLive = Layer.succeed(Terminal, {
  log: (message = "") => Effect.sync(() => console.log(message)),

  error: (message) =>
    Effect.sync(() => {
      console.error(`${chalk.red(logSymbols.error)} ${chalk.dim("Error:")} ${chalk.red(message)}`);
    }),

  warn: (message) =>
    Effect.sync(() => {
      console.log(chalk.yellow(`${logSymbols.warning} ${message}`));
    }),

  success: (message) =>
    Effect.sync(() => {
      console.log(chalk.green(`${logSymbols.success} ${message}`));
    }),

  info: (message) =>
    Effect.sync(() => {
      console.log(chalk.cyan(`${logSymbols.info} ${message}`));
    }),

  muted: (message) =>
    Effect.sync(() => {
      console.log(chalk.gray(message));
    }),

  startSpinner: (message) =>
    Effect.sync(() => {
      stopActiveSpinnerUnsafe();
      spinnerStartedAt = Date.now();
      activeSpinner = ora({
        text: message,
        isEnabled: process.stdout.isTTY,
        spinner: "dots",
      }).start();
    }),

  updateSpinner: (message) =>
    Effect.sync(() => {
      if (activeSpinner) {
        activeSpinner.text = message;
      }
    }),

  succeedSpinner: (message) =>
    Effect.sync(() => {
      if (!activeSpinner) {
        return;
      }
      const suffix = formatElapsedSuffix();
      const base = message !== undefined && message.trim() !== "" ? message : "Done";
      activeSpinner.succeed(`${base}${suffix}`);
      activeSpinner = undefined;
      spinnerStartedAt = undefined;
    }),

  failSpinner: (message) =>
    Effect.sync(() => {
      if (!activeSpinner) {
        return;
      }
      activeSpinner.fail(message);
      activeSpinner = undefined;
      spinnerStartedAt = undefined;
    }),

  warnSpinner: (message) =>
    Effect.sync(() => {
      if (!activeSpinner) {
        return;
      }
      activeSpinner.warn(message);
      activeSpinner = undefined;
      spinnerStartedAt = undefined;
    }),

  stopSpinner: Effect.sync(() => {
    stopActiveSpinnerUnsafe();
  }),

  box: (content, options) =>
    Effect.sync(() => {
      console.log(
        boxen(content, {
          padding: { top: 0, bottom: 0, left: 1, right: 1 },
          margin: { top: 0, bottom: 1, left: 0, right: 0 },
          borderStyle: "round",
          borderColor: "gray",
          title: options?.title,
        }),
      );
    }),
});
