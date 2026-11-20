/* Optional download guidance for the EOS-503 test site shell. */
(() => {
    'use strict';

    const footer = document.querySelector('#unity-footer');
    const dialogs = new WeakSet();
    const sampleName = 'EOS503-download-test.csv';

    function element(tag, className, text) {
        const node = document.createElement(tag);
        node.className = className;
        if (text) node.textContent = text;
        return node;
    }

    function button(className, text, action) {
        const control = element('button', className, text);
        control.type = 'button';
        control.addEventListener('click', action);
        return control;
    }

    function addFilenameGuide(dialog) {
        if (dialogs.has(dialog)) return;
        const body = dialog.querySelector('.eos503-export-body');
        const filename = /^(?:You have finished\. )?Save ([0-9]{8}(?:_part[1-9][0-9]*|_inprogress)?\.csv)(?=[ .])/.exec(body?.textContent)?.[1];
        if (!filename) return;
        dialogs.add(dialog);

        const guide = element('div', 'eos-download-guide');
        const row = element('div', 'eos-download-guide-filename');
        const label = element('label', '', 'Filename');
        const filenameField = element('input', 'eos-download-guide-name');
        filenameField.type = 'text';
        filenameField.readOnly = true;
        filenameField.value = filename;
        label.appendChild(filenameField);
        const status = element('span', 'eos-download-guide-copy-status');
        status.setAttribute('role', 'status');
        const copy = button('eos-download-guide-control', 'Copy filename', async () => {
            try {
                await navigator.clipboard.writeText(filename);
                status.textContent = 'Filename copied.';
            } catch {
                filenameField.focus();
                filenameField.select();
                status.textContent = 'Filename selected. Press Ctrl+C or Command+C to copy.';
            }
        });
        row.append(label, copy);
        guide.append(row, status, element('p', 'eos-download-guide-instructions',
            'Open your browser’s Downloads list and look for this filename. Choose Show in folder or Show in Finder to locate it. If your browser asks where to save, choose a folder you can find again. If the file is missing, use Download again. Upload the original CSV directly.'));
        body.after(guide);
    }

    if (footer) {
        const notice = element('p', 'eos-download-guide-test-notice');
        notice.setAttribute('role', 'status');
        notice.hidden = true;
        let hideNotice;
        const test = button('eos-download-guide-control eos-download-guide-test', 'Test download', () => {
            let url;
            const link = document.createElement('a');
            try {
                const sample = new Blob(['file,purpose\r\nEOS503-download-test,Sample only - do not upload\r\n'], { type: 'text/csv;charset=utf-8' });
                url = URL.createObjectURL(sample);
                link.href = url;
                link.download = sampleName;
                link.hidden = true;
                document.body.appendChild(link);
                link.click();
                notice.textContent = `Test download requested. Check your browser’s Downloads for ${sampleName}. Upload your game CSV after you finish playing.`;
            } catch {
                notice.textContent = 'The test download could not be requested. Check your browser’s Downloads and try again.';
            } finally {
                link.remove();
                if (url) window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
                notice.hidden = false;
                window.clearTimeout(hideNotice);
                hideNotice = window.setTimeout(() => { notice.hidden = true; }, 20_000);
            }
        });
        test.title = 'Optional. Check your browser can save a sample CSV.';
        footer.append(test, notice);
    }

    for (const dialog of document.querySelectorAll('.eos503-export-dialog')) addFilenameGuide(dialog);
    const observer = new MutationObserver(records => {
        for (const record of records) {
            for (const node of record.addedNodes) {
                if (node instanceof Element && node.classList.contains('eos503-export-dialog')) addFilenameGuide(node);
            }
        }
    });
    observer.observe(document.body, { childList: true });
})();
