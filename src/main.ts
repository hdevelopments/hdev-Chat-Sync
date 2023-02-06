import "reflect-metadata";
import { dirname, importx } from "@discordx/importer";
import {
  Interaction,
  Message,
  Partials,
  Events,
  ActivitiesOptions,
} from "discord.js";
import { IntentsBitField } from "discord.js";
import { Client, DIService, typeDiDependencyRegistryEngine } from "discordx";
import Config from "./discordConfig";
import { NoBot } from "./discord/guards/noBots";
import { Container, Service } from "typedi";
import discordsApi from "./utils/botsfordiscordapi";
import express from "express";
import { apirouter } from "./express/api/api";

export var memberCounts = 0;
var discords = new discordsApi();
DIService.engine = typeDiDependencyRegistryEngine
  .setService(Service)
  .setInjector(Container);

export const bot = new Client({
  // Discord intents
  intents: [
    IntentsBitField.Flags.Guilds,
    IntentsBitField.Flags.GuildMessages,
    IntentsBitField.Flags.GuildMessageReactions,
    IntentsBitField.Flags.MessageContent,
    IntentsBitField.Flags.DirectMessageReactions,
    IntentsBitField.Flags.DirectMessages,
  ],
  partials: [Partials.Channel],
  // Debug logs are disabled in silent mode
  silent: false,
  guards: [NoBot],
  // Configuration for @SimpleCommand
  simpleCommand: {
    prefix: "hc!",
  },
});

function syncActivities() {
  const botActivities: ActivitiesOptions[] = [
    {
      name: `Chatting with: ${bot.guilds.cache.size} guilds`,
    },
    {
      name: `Support: discord.gg/hdev`,
    },
    {
      name: `Check out BytesToBit!: discord.gg/bytestobits`,
    },
    {
      name: `with ${memberCounts} Members!`,
    },
  ];

  bot.user?.setActivity(
    botActivities[Math.floor(Math.random() * botActivities.length)]
  );
  // bot.user?.setActivity(botActivities[3]);
}
bot.once(Events.ClientReady, async () => {
  // Make sure all guilds are cached
  var guilds = await bot.guilds.fetch();
  guilds.forEach(async (x) => {
    var guild = await x.fetch();
    memberCounts += guild.memberCount;
  });
  // await bot.clearApplicationCommands();
  // await bot.clearApplicationCommands(...[
  //   "932286006156222495",
  //   "995759386142179358",
  //   "1045689302199312465",
  // ]);

  // Synchronize applications commands with Discord
  try {
    await bot.initApplicationCommands();
  } catch (exc: any) {
    console.log(exc.rawError);
  }

  setInterval(async () => {
    memberCounts = 0;
    var guilds = await bot.guilds.fetch();
    guilds.forEach(async (x) => {
      var guild = await x.fetch();
      memberCounts += guild.memberCount;
    });
  }, 15 * 60 * 1000);

  syncActivities();
  setInterval(() => {
    syncActivities();
  }, 15 * 1000);
  await discords.syncUp();
  setInterval(async () => {
    await discords.syncUp();
  }, 30 * 60 * 1000);
  console.log("Bot started");
});

bot.on(Events.MessageReactionAdd, (reaction, user) => {
  bot.executeReaction(reaction, user);
});

bot.on(Events.InteractionCreate, (interaction: Interaction) => {
  try {
    // do not execute interaction, if it's pagination (avoid warning: select-menu/button interaction not found)
    if (interaction.isButton() || interaction.isStringSelectMenu()) {
      if (interaction.customId.startsWith("discordx@pagination@")) {
        return;
      }
    }
    bot.executeInteraction(interaction);
    return;
  } catch (exc) {
    console.log(exc);
  }
});

bot.on(Events.MessageCreate, (message: Message) => {
  try {
    bot.executeCommand(message);
  } catch (exc) {
    console.log(exc);
  }
});

async function run() {
  // The following syntax should be used in the commonjs environment
  //
  // await importx(__dirname + "/{events,commands}/**/*.{ts,js}");

  // The following syntax should be used in the ECMAScript environment
  const __dirname = dirname(import.meta.url);

  await importx(`${__dirname}/discord/{events,commands}/**/*.{ts,js}`);

  // Let's start the bot
  if (!Config.Bot_Token) {
    throw Error("Could not find BOT_TOKEN in the config");
  }

  // Log in with your bot token
  await bot.login(Config.Bot_Token);
}
run();

var App = express();

App.use("/api", apirouter);

App.listen(3000);

export default bot;
export { App };
