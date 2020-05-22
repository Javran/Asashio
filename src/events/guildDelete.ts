import log4js from "log4js"
import { Guild } from "discord.js"

const Logger = log4js.getLogger("left")

export async function handle(guild: Guild): Promise<void> {
    Logger.info(`Left ${guild.id} - ${guild.name} with ${guild.memberCount} members`)
}