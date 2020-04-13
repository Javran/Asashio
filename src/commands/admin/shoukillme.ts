import { Message, MessageReaction } from "discord.js"

import Command from "../../utils/Command"
import client from "../../main"
import config from "../../data/config.json"

const Logger = require("log4js").getLogger("shoukillme")

export default class ShouKillMe extends Command {
    constructor(name: string) {
        super({
            name,
            category: "Admin",
            help: "Kills bot. Admins only.",
            usage: "shoukillme",
            aliases: ["shutdown", "sink"]
        })
    }

    async run(message: Message): Promise<Message | Message[]> {
        if (!config.admins.includes(message.author.id)) return message.reply("Admins only")

        Logger.info(`Shutting down by ${message.author.id}`)
        let toRemove: (Promise<MessageReaction> | undefined)[] = []

        const user = client.user
        if (user != undefined) {
            await user.setStatus("dnd")

            toRemove = client.recentMessages
                .map(reply => reply?.reactions?.cache.map((reaction) => reaction.me ? reaction.users.remove(user) : undefined).find(k => k))
                .filter(k => k)
        }
        const reply = await message.reply(`Shutting down after cleanup. ${toRemove.length ? `Removing ${toRemove.length} reactions...` : ""}`)

        client.tweetManager.shutdown()
        await client.timerManager.update()
        try {
            await Promise.all(toRemove)
            await reply.edit("<:wooper:617004982440427606>")
        } catch (error) {
            await reply.edit("<:wooper:617004982440427606>, some reactions not removed")
        }
        await client.destroy()
        process.exit()
        return reply
    }
}
