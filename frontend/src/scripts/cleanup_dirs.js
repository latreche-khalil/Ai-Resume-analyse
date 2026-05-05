const fs = require('fs');
const path = require('path');

const sourceDir = 'src/components/candidate/analysis';
const destDir = 'src/components/shared/analysis';

if (fs.existsSync(sourceDir)) {
    const files = fs.readdirSync(sourceDir);
    files.forEach(file => {
        const sourcePath = path.join(sourceDir, file);
        const destPath = path.join(destDir, file);
        fs.renameSync(sourcePath, destPath);
        console.log(`Moved ${file}`);
    });
    fs.rmdirSync(sourceDir);
    console.log(`Removed ${sourceDir}`);
}

const emptyAnalysisDir = 'src/components/analysis';
if (fs.existsSync(emptyAnalysisDir)) {
    const files = fs.readdirSync(emptyAnalysisDir);
    files.forEach(file => {
        fs.unlinkSync(path.join(emptyAnalysisDir, file));
    });
    fs.rmdirSync(emptyAnalysisDir);
    console.log(`Removed ${emptyAnalysisDir}`);
}
