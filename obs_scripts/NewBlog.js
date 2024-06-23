const util = require('util');
const child_process = require('child_process');
const exec = util.promisify(child_process.exec);


function getCreateTimeAsFileName() {
    var d = new Date();
    var year = d.getFullYear();
    var month = d.getMonth() + 1;
    var day = d.getDate();
    var hour = d.getHours();
    var minute = d.getMinutes();
    var second = d.getSeconds();
    var time = year + "m" + month + "d" + day + "h" + hour + "m" + minute + "s" + second;
    return time;
}



// execute command function

async function executeCommand() {
    const fileName = getCreateTimeAsFileName() + ".md";
    const hugoPath = '/opt/homebrew/bin/hugo';
    const projectPath = '/Users/CatTail/Documents/Project/CatTail';
    const { stdout, stderr } = await exec(`${hugoPath} new posts/${fileName}`, { cwd: projectPath });
    console.log('stdout:', stdout);
    console.log('stderr:', stderr);
    if (stdout) {
        new Notice("New Blog Created[" + fileName + "]")
    } else {
        new Notice("New Blog Create Faild. " + stderr)
    }
}



module.exports = async function (context, req) {
    await executeCommand();
}
