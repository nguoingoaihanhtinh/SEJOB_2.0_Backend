import fs from "fs";
import path from "path";

export class MessageUtil {
    private static messages: Record<string, string> = {};
    private static readonly filePath = path.join(process.cwd(), "messages.json");

    static {
        MessageUtil.loadMessages();
        MessageUtil.watchMessages();
    }

    private static loadMessages() {
        try {
            if (fs.existsSync(this.filePath)) {
                const data = fs.readFileSync(this.filePath, "utf8");
                this.messages = JSON.parse(data);
                console.log("Loaded messages.json");
            }
        } catch (error) {
            console.error("Error loading messages.json:", error);
        }
    }

    private static watchMessages() {
        try {
            if (fs.existsSync(this.filePath)) {
                fs.watch(this.filePath, (eventType) => {
                    if (eventType === "change") {
                        try {
                            // Add a small delay for the write to finish
                            setTimeout(() => {
                                const data = fs.readFileSync(this.filePath, "utf8");
                                this.messages = JSON.parse(data);
                                console.log("Reloaded messages.json due to file change");
                            }, 100);
                        } catch (err) {
                            console.error("Failed to parse messages.json during reload", err);
                        }
                    }
                });
            }
        } catch (error) {
            console.error("Error watching messages.json:", error);
        }
    }

    public static get(key: string, ...args: string[]): string {
        const msg = this.messages[key];
        if (msg === undefined) {
            return key;
        }
        let result = msg;
        args.forEach((arg, index) => {
            result = result.replace(new RegExp(`\\{${index}\\}`, "g"), arg);
        });
        return result;
    }
}
