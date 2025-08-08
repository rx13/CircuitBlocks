import * as os from "os";
import {app, ipcMain} from "electron"
import logger from "./logger";
import messenger, {MessageType} from "./messenger";
import {UpdateInfo} from "electron-updater";
import * as util from "../compiler/util";
import * as child_process from "child_process";

import { autoUpdater } from "electron-updater";

export default class Update {

    private uInfo: UpdateInfo | undefined = undefined;

    public constructor(){
        const plat = os.type();
        const arch = os.arch();
        const ver = app.getVersion();

        autoUpdater.autoInstallOnAppQuit = false;
        autoUpdater.autoDownload = false;
autoUpdater.setFeedURL({
    url: `https://repman.circuitmess.com/update/${plat}/${arch}/${ver}/`,
    provider: "generic"
});

        autoUpdater.on("download-progress", (progress) => this.onData(progress));

        autoUpdater.on("error", (error) => {
            logger.log("Update check error", error);
            if(!this.uInfo) return;

            messenger.report(MessageType.ERROR,
                [ "Update failed to download. You can download it manually at",
                    "[[" + this.uInfo.path + "]]",
                    "Compiling sketches might not work until you update.",
                    "If this continues, please send an error report and contact our support." ],
                [{ title: "Ok" }, { title: "Send error report", action: "report", secondary: true }]);

            logger.log("Update download error", error);
        });

        autoUpdater.on("update-downloaded", (info: UpdateInfo) => {
            autoUpdater.quitAndInstall(false, true);
        });
    }

    public setCertCheck(){
        autoUpdater.netSession.setCertificateVerifyProc((request: any, callback: (result: number) => void) => {
            if(request.hostname == "repman.circuitmess.com" && request.certificate.subjectName == "circuitmess.com"){
                callback(0);
            }else{
                callback(-3);
            }
        });
    }

    private onData(progress){
        let text = "kb/s";
        let speed = Math.round(progress.bytesPerSecond / 1024);
        if(speed > 1000){
            speed /= 1024;
            speed = Math.round(speed * 10) / 10;
            text = "mb/s";
        }

        messenger.report(MessageType.UPDATE,
            [ "" + (Math.round(progress.percent * 100) / 100) + "%, " + speed + " " + text,
                "A new update is downloading.", "When finished, CircuitBlocks will restart." ],
            undefined, true);
    }

    public check(){
        this.uInfo = undefined;

        autoUpdater.checkForUpdates().then(result => {
            if(!result) return;

            if(os.type() == "Linux"){
                messenger.report(MessageType.UPDATE,
                    [ "Version " + result.updateInfo.version + " is available. You can download it at",
                        "[[https://github.com/CircuitMess/CircuitBlocks/releases/latest]]", "Compiling sketches might not work until you update." ],
                    [{ title: "Ok" }]);

                return;
            }

            messenger.report(MessageType.UPDATE,
                [ "A new update is downloading.", "When finished, CircuitBlocks will restart." ],
                undefined, true);

            this.uInfo = result.updateInfo;

            if(os.type() == "Darwin"){
                const tmpDir = util.tmpdir("cb-update");
                util.download(result.updateInfo.path, tmpDir, (progress) => this.onData(progress)).then((path) => {
                    child_process.execSync(["open", path].join(" "));
                    process.exit(0);
                }).catch((error) => {
                    messenger.report(MessageType.ERROR,
                        [ "Update failed to download. You can download it manually at",
                            "[[" + result.updateInfo.path + "]]",
                            "Compiling sketches might not work until you update.",
                            "If this continues, please send an error report and contact our support." ],
                        [{ title: "Ok" }, { title: "Send error report", action: "report", secondary: true }]);

                    logger.log("Update download error", error);
                });

                return;
            }

            autoUpdater.downloadUpdate(result.cancellationToken).then(dlResult => {

            }).catch(dlError => {
                messenger.report(MessageType.ERROR,
                    [ "Update failed to download. You can download it manually at",
                        "[[" + result.updateInfo.path + "]]",
                        "Compiling sketches might not work until you update.",
                        "If this continues, please send an error report and contact our support." ],
                    [{ title: "Ok" }, { title: "Send error report", action: "report", secondary: true }]);

                logger.log("Update download error", dlError);
            });
        }).catch(error => {
            logger.log("CB Update check error", error);
        });
    }
}
