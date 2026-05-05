const fs = require('fs');
const path = require('path');

const baseDir = 'src/components/candidate';
const subDirs = ['dashboard', 'analysis'];

subDirs.forEach(sub => {
    const subPath = path.join(baseDir, sub);
    if (fs.existsSync(subPath)) {
        const files = fs.readdirSync(subPath);
        files.forEach(file => {
            const oldPath = path.join(subPath, file);
            const newPath = path.join(baseDir, file);
            
            // Avoid overwriting if file exists in base
            if (!fs.existsSync(newPath)) {
                fs.renameSync(oldPath, newPath);
                console.log(`Moved ${file} to ${baseDir}`);
            } else {
                console.log(`File ${file} already exists in ${baseDir}, skipping...`);
            }
        });
        // Try to remove subDir (only if empty)
        try {
            fs.rmdirSync(subPath);
            console.log(`Removed empty directory ${subPath}`);
        } catch (e) {
            console.log(`Could not remove ${subPath}: ${e.message}`);
        }
    }
});
