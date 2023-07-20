const TelegramBot = require("node-telegram-bot-api");
const express = require("express");
const app = express();

require("dotenv").config();
const token = process.env.TELEGRAM_TOKEN;
const bot = new TelegramBot(token, { polling: true });

const fs = require("fs");
const ytdl = require("ytdl-core");
const ffmpeg = require("fluent-ffmpeg");
bot.onText(/\/start/, (msg) => {
    const chatId = msg.chat.id;
    bot.sendMessage(
        chatId,
        "Welcome to YatikDownload bot , made by @YASSINE_ATK . \n Please send me the link of the video you want to download ."
    );
});
let downloadLink,
    mp4DownloadPath,
    videoId,
    mp4FileStream,
    mp4DownloadStream,
    mp3DownloadPath,
    mp3FileStream,
    mp3DownloadStream;

bot.on("message", (msg) => {
    const chatId = msg.chat.id;
    const messageText = msg.text;

    if (messageText === "/start") {
        return; // Skip further processing for the /start command
    }

    if (messageText.includes("youtube")) {
        videoId = ytdl.getURLVideoID(messageText);
        downloadLink = `https://youtube.com/watch?v=${videoId}`;
        mp4DownloadPath = `./video_${videoId}.mp4`;

        // Send the options message after processing the YouTube link
        bot.sendMessage(chatId, "Please Choose a Quality", {
            reply_markup: {
                keyboard: [["Low"], ["High"]],
                resize_keyboard: true,
                one_time_keyboard: true,
            },
        });
    } else if (["Low", "High"].includes(messageText)) {
        bot.sendMessage(chatId, "One moment ... ");
        bot.sendMessage(
            chatId,
            `Downloading video in ${messageText} quality ...`
        );

        mp4DownloadStream = ytdl(downloadLink, {
            filter: (format) => format.container === "mp4",
            quality: messageText == "Low" ? "lowestvideo" : "highestvideo",
        });

        mp4FileStream = fs.createWriteStream(mp4DownloadPath);
        mp4DownloadStream.pipe(mp4FileStream);
        mp4DownloadStream.on("end", () => {
            bot.sendMessage(chatId, "Downloading Sound ...");
            mp3DownloadPath = `./aidop_${videoId}.mp3`;
            mp3DownloadStream = ytdl(downloadLink, {
                filter: (format) => format.container === "mp4",
                quality: messageText == "Low" ? "lowestaudio" : "highestaudio",
            });
            mp3FileStream = fs.createWriteStream(mp3DownloadPath);
            mp3DownloadStream.pipe(mp3FileStream);
            mp3DownloadStream.on("end", () => {
                const mergedFilePath = `./merged_${videoId}.mp4`;
                bot.sendMessage(chatId, "Merging video with sound ...");

                const command = ffmpeg()
                    .input(mp4DownloadPath)
                    .input(mp3DownloadPath)
                    .output(mergedFilePath)

                    .on("end", () => {
                        const videoData = fs.readFileSync(mergedFilePath);
                        bot.sendVideo(chatId, videoData, {
                            caption: "Enjoy your video",
                            filename: "video.mp4",
                        });

                        fs.unlinkSync(mp4DownloadPath);
                        fs.unlinkSync(mp3DownloadPath);
                        fs.unlinkSync(mergedFilePath);
                    })
                    .on("error", (error) => {
                        console.log("Error merging files", error);
                        bot.sendMessage(
                            chatId,
                            "AN error accured while merging the files , please try again"
                        );
                        fs.unlinkSync(mp4DownloadPath);
                        fs.unlinkSync(mp3DownloadPath);
                        fs.unlinkSync(mergedFilePath);
                    })
                    .run();
            });
            mp3DownloadStream.on("error", (error) => {
                console.log("Error downloading audio ", error);
                bot.sendMessage(chatId, "An error while downloading the audio");
            });
        });
        mp4DownloadStream.on("error", (error) => {
            console.log("Error downloading the video", error);
            bot.sendMessage(
                chatId,
                "Error accured while downloading the video"
            );
        });
    } else {
        bot.sendMessage(chatId, "Please enter a valid youtube URL");
    }
});

const port = 3000;
app.listen(port, () => {
    console.log(`Telegram bot is running on port ${port}`);
});
