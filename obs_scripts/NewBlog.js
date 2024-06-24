const util = require('util');
const child_process = require('child_process');
const exec = util.promisify(child_process.exec);


// execute command function

async function executeCommand(fileName, pathPrefix) {
    const hugoPath = '/opt/homebrew/bin/hugo';
    const fullPath = `${pathPrefix}/${fileName}.md`;
    const projectPath = '/Users/CatTail/Documents/Project/CatTail';
    const { stdout, stderr } = await exec(`${hugoPath} new ${fullPath}`, { cwd: projectPath });
    console.log('stdout:', stdout);
    console.log('stderr:', stderr);
    if (stdout) {
        new Notice("New Blog Created[" + fileName + "]")
    } else {
        new Notice("New Blog Create Faild. " + stderr)
    }
}



module.exports = async function (context, req) {
    const fileName = await context.quickAddApi.inputPrompt("Enter file name");
    const pathPrefix = await context.quickAddApi.inputPrompt('Enter path prefix');

    if (!fileName || !pathPrefix) {
        new Notice('File name and project path cannot be empty');
        return;
    }

    await executeCommand(fileName, pathPrefix);
}
