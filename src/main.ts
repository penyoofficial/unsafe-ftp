import * as http from "http";
import * as fs from "fs";
import * as path from "path";

/** 端口 */
const port: number = 666;
/** 根路径 */
const sourcePath: string = path.resolve("C:/");

/**
 * 尝试提供目录。
 */
function serveDirectory(
  req: http.IncomingMessage,
  res: http.ServerResponse,
  directoryPath: string,
) {
  res.setHeader("Content-Type", "text/html; charset=utf-8");

  fs.readdir(directoryPath, { withFileTypes: true }, (err, files) => {
    if (err) {
      res.statusCode = 500;
      res.end("服务器内部出错！");
      return;
    }

    files.sort((a, b) => a.name.localeCompare(b.name));
    files = files.filter((f) => f.name !== "desktop.ini");

    const directories: fs.Dirent[] = [];
    const normalFiles: fs.Dirent[] = [];

    for (const file of files) {
      if (file.isDirectory()) {
        directories.push(file);
      } else {
        normalFiles.push(file);
      }
    }

    const html = `
      <h1>当前目录：${directoryPath.slice(sourcePath.length) || "\\"}</h1>
      <ul>
      ${
        path.resolve(directoryPath) !== path.resolve(sourcePath)
          ? `<li><i><a href="../" style="color: #666;">返回上一级</a></i></li>`
          : ""
      }
        ${directories
          .map((directory) => {
            const link = `${directory.name}/`;
            return `<li><a href="${link}" style="color: #ffa631;">${directory.name}</a></li>`;
          })
          .join("")}
        ${normalFiles
          .map((file) => {
            const link = `${file.name}`;
            return `<li><a href="${link}" style="color: #4b5cc4;">${file.name}</a></li>`;
          })
          .join("")}
      </ul>
    `;

    res.end(html);
  });
}

/**
 * 尝试提供文件。
 */
function serveFile(
  req: http.IncomingMessage,
  res: http.ServerResponse,
  filePath: string,
) {
  /**
   * 检查文件是否是指定类型。
   */
  function isType(fTypes: string[]) {
    let flag = false;
    const fType = filePath.split(".").reverse()[0];
    fTypes.forEach((t) => {
      if (fType === t) flag = true;
    });
    return { r: flag, t: fType };
  }

  let header = "";

  const ftVideo = isType(["mp4", "avi", "mkv"]);
  const ftAudio = isType(["mp3", "aac", "ogg", "wav", "flac"]);

  if (ftVideo.r) header = `video/${ftVideo.t}`;
  else if (ftAudio.r) header = `audio/${ftAudio.t}`;

  res.setHeader("Content-Type", header);

  const fileStream = fs.createReadStream(filePath);
  fileStream.pipe(res);

  fileStream.on("error", (err) => {
    if (err.message.includes("ENOENT")) {
      res.statusCode = 404;
      res.end("该文件不存在！");
    } else {
      res.statusCode = 500;
      res.end("服务器内部出错！");
    }
  });
}

const server = http.createServer(
  (req: http.IncomingMessage, res: http.ServerResponse) => {
    res.setHeader("Content-Type", "text/html; charset=utf-8");

    const url = new URL(req.url!, `http://${req.headers.host}`);
    const filePath = path.join(
      sourcePath,
      decodeURIComponent(url.pathname.slice(1)),
    );

    fs.stat(filePath, (err, stats) => {
      if (err) {
        res.statusCode = 404;
        res.end("该路径不存在或无权访问！");
        return;
      }

      if (stats.isDirectory()) {
        serveDirectory(req, res, filePath);
      } else {
        serveFile(req, res, filePath);
      }
    });
  },
);

server.listen(port, () => {
  console.log("Copyright (c) Penyo. All rights reserved.");
  console.log(`服务器正在运行在 http://localhost:${port}/ 上。`);
});
