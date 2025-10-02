import { Editor, MarkdownView, Plugin } from 'obsidian';

export default class TimeSumPlugin extends Plugin {

    async onload() {
        this.addCommand({
            id: 'sum-time-durations',
            name: 'Sum time durations',
            editorCallback: (editor: Editor, view: MarkdownView) => {
                const oldContent = editor.getValue();
                const newContent = this.calculateTime(oldContent);
                if (oldContent !== newContent) {
                    editor.setValue(newContent);
                }
            }
        });

        this.registerEvent(
            this.app.workspace.on('layout-change', this.onLayoutChange)
        );
    }

    onunload() {
        this.app.workspace.off('layout-change', this.onLayoutChange);
    }

    onLayoutChange = async () => {
        const activeView = this.app.workspace.getActiveViewOfType(MarkdownView);
        if (activeView && activeView.getMode() === 'preview') {
            const file = activeView.file;
            if (!file) return;

            const oldContent = await this.app.vault.cachedRead(file);
            const newContent = this.calculateTime(oldContent);

            if (oldContent !== newContent) {
                await this.app.vault.modify(file, newContent);
            }
        }
    }

    calculateTime(content: string): string {
        const timeRegex = /\((\s*(?:(\d+)\s*w)?\s*(?:(\d+)\s*d)?\s*(?:(\d+)\s*h)?\s*(?:(\d+)\s*m)?\s*)\)/g;
        const blockRegex = /(```time-sum\n)([\s\S]*?)(```)/;

        if (!blockRegex.test(content)) {
            return content;
        }

        let totalMinutes = 0;
        let match;

        // Exclude the time-sum block itself from the calculation
        const contentWithoutBlock = content.replace(blockRegex, '');

        while ((match = timeRegex.exec(contentWithoutBlock)) !== null) {
            const weeks = parseInt(match[2]) || 0;
            const days = parseInt(match[3]) || 0;
            const hours = parseInt(match[4]) || 0;
            const minutes = parseInt(match[5]) || 0;
            
            totalMinutes += (weeks * 7 * 24 * 60) + (days * 24 * 60) + (hours * 60) + minutes;
        }

        let formattedTime = "0m";
        if (totalMinutes > 0) {
            const outDays = Math.floor(totalMinutes / (24 * 60));
            const remainingMinutes = totalMinutes % (24 * 60);
            const outHours = Math.floor(remainingMinutes / 60);
            const outMinutes = remainingMinutes % 60;

            let tempTime = "";
            if (outDays > 0) tempTime += `${outDays}d `;
            if (outHours > 0) tempTime += `${outHours}h `;
            if (outMinutes > 0) tempTime += `${outMinutes}m`;
            formattedTime = tempTime.trim();
        }
        
        return content.replace(blockRegex, `$1${formattedTime}\n$3`);
    }
}