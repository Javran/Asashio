import client from "../main"
import log4js from "log4js"

const Logger = log4js.getLogger("ready")

let alreadyLoaded = false
export async function handle(): Promise<void> {
    Logger.info(`In ${client.channels.size} channels on ${client.guilds.size} servers, for a total of ${client.users.size} users.`)

    if(alreadyLoaded) return
    alreadyLoaded = true

    client.user.setStatus("online")

    client.linkManager.loadLinks()
    client.timerManager.init()
    client.tweetManager.init()
    client.data.reloadShipData()
    client.maintManager.init()
}