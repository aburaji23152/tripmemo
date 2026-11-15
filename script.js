// データの読み込みと初期化（localStorageから取得）
const tableBody = document.getElementById('tableBody');
let records = JSON.parse(localStorage.getItem('trainRecords')) || [];
let collapsedDates = JSON.parse(localStorage.getItem('collapsedDates')) || {};
let editingIndex = -1;

// トースト通知
let toastTimer;
function showToast(message) {
    const toast = document.getElementById('toast');
    toast.textContent = message;
    toast.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => {
        toast.classList.remove('show');
    }, 2800);
}

// カスタム確認ダイアログ
function showConfirm(title, message) {
    return new Promise((resolve) => {
        const modal = document.getElementById('confirmModal');
        document.getElementById('modalTitle').textContent = title;
        document.getElementById('modalMessage').textContent = message;
        modal.classList.remove('hidden');

        const cancelBtn = document.getElementById('modalCancelBtn');
        const confirmBtn = document.getElementById('modalConfirmBtn');

        const cleanup = (result) => {
            modal.classList.add('hidden');
            cancelBtn.removeEventListener('click', onCancel);
            confirmBtn.removeEventListener('click', onConfirm);
            resolve(result);
        };

        const onCancel = () => cleanup(false);
        const onConfirm = () => cleanup(true);

        cancelBtn.addEventListener('click', onCancel);
        confirmBtn.addEventListener('click', onConfirm);
    });
}

// 今日の日付（ローカルタイム）をフォームの初期値にする
function setTodayDate() {
    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const dd = String(today.getDate()).padStart(2, '0');
    document.getElementById('date').value = `${yyyy}-${mm}-${dd}`;
}

// 日付フォーマット整形
function formatDateLabel(dateStr) {
    const parts = dateStr.split('-');
    if (parts.length !== 3) return dateStr;
    const d = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
    const weekdays = ['日', '月', '火', '水', '木', '金', '土'];
    return `${parts[0]}年${Number(parts[1])}月${Number(parts[2])}日 (${weekdays[d.getDay()]})`;
}

// データを【開閉状態】＞【日付順(新しい順)】＞【時刻順】にソートする関数
function sortRecords() {
    records.sort((a, b) => {
        const aCollapsed = collapsedDates[a.date] || false;
        const bCollapsed = collapsedDates[b.date] || false;

        if (aCollapsed !== bCollapsed) {
            return aCollapsed ? 1 : -1;
        }
        if (a.date !== b.date) {
            return b.date.localeCompare(a.date);
        }
        return a.time.localeCompare(b.time);
    });
}

// テーブルの描画処理
function renderTable() {
    tableBody.innerHTML = '';
    if (records.length === 0) {
        tableBody.innerHTML = `<tr><td colspan="8" class="empty-state">まだ乗車記録がありません。上のフォームから追加してください。</td></tr>`;
        lucide.createIcons();
        return;
    }

    if (editingIndex === -1) {
        sortRecords();
    }

    // 日付ごとの件数をカウント
    const dateCounts = records.reduce((acc, rec) => {
        acc[rec.date] = (acc[rec.date] || 0) + 1;
        return acc;
    }, {});

    let currentScaleDate = '';

    records.forEach((record, index) => {
        // 日付の見出し行
        if (record.date !== currentScaleDate) {
            currentScaleDate = record.date;
            const formattedDate = formatDateLabel(record.date);
            const isCollapsed = collapsedDates[record.date] || false;

            const dateRow = document.createElement('tr');
            dateRow.className = `date-header-row ${isCollapsed ? 'collapsed' : ''}`;
            dateRow.setAttribute('data-date', record.date);
            dateRow.innerHTML = `
                <td colspan="8">
                    <div class="date-header-content">
                        <div class="date-title-group">
                            <i data-lucide="chevron-down" class="chevron-icon"></i>
                            <span>${formattedDate}</span>
                            <span class="count-pill">${dateCounts[record.date]}本</span>
                            ${isCollapsed ? '<span class="collapsed-note">（折りたたみ中）</span>' : ''}
                        </div>
                        <button class="mini-btn mini-delete delete-date-btn" data-date="${record.date}" title="この日の記録をすべて削除">
                            <i data-lucide="trash-2"></i>
                            <span>この日を削除</span>
                        </button>
                    </div>
                </td>
            `;
            tableBody.appendChild(dateRow);
        }

        const tr = document.createElement('tr');
        tr.className = 'record-row';
        if (collapsedDates[record.date]) {
            tr.classList.add('hidden-row');
        }

        const depDelayVal = parseInt(record.depDelay) || 0;
        const arrDelayVal = parseInt(record.arrDelay) || 0;

        if (editingIndex === index) {
            tr.innerHTML = `
                <td><input type="text" id="edit_depStation" value="${escapeHTML(record.depStation)}"></td>
                <td><input type="time" id="edit_time" value="${escapeHTML(record.time)}"></td>
                <td><input type="text" id="edit_arrStation" value="${escapeHTML(record.arrStation)}"></td>
                <td><input type="number" id="edit_depDelay" value="${depDelayVal}" min="0" style="width:64px;"></td>
                <td><input type="number" id="edit_arrDelay" value="${arrDelayVal}" min="0" style="width:64px;"></td>
                <td><input type="text" id="edit_trainNum" value="${escapeHTML(record.trainNum)}" style="width:84px;"></td>
                <td><input type="text" id="edit_memo" value="${escapeHTML(record.memo)}"></td>
                <td>
                    <div class="row-actions">
                        <button class="mini-btn mini-save save-btn" data-index="${index}">保存</button>
                        <button class="mini-btn mini-cancel cancel-btn">中止</button>
                    </div>
                </td>
            `;
        } else {
            const depBadge = depDelayVal >= 1
                ? `<span class="delay-badge delayed">+${depDelayVal}</span>`
                : `<span class="delay-badge ontime">0</span>`;
            const arrBadge = arrDelayVal >= 1
                ? `<span class="delay-badge delayed">+${arrDelayVal}</span>`
                : `<span class="delay-badge ontime">0</span>`;
            const trainDisplay = record.trainNum
                ? `<span class="train-badge">${escapeHTML(record.trainNum)}</span>`
                : `<span style="color:var(--text-muted)">-</span>`;

            tr.innerHTML = `
                <td class="station-cell">${escapeHTML(record.depStation)}</td>
                <td class="time-cell">${escapeHTML(record.time)}</td>
                <td class="station-cell">${escapeHTML(record.arrStation)}</td>
                <td class="text-center">${depBadge}</td>
                <td class="text-center">${arrBadge}</td>
                <td>${trainDisplay}</td>
                <td>${escapeHTML(record.memo)}</td>
                <td>
                    <div class="row-actions">
                        <button class="mini-btn mini-edit edit-btn" data-index="${index}" title="編集">
                            <i data-lucide="pencil"></i>
                        </button>
                        <button class="mini-btn mini-delete delete-btn" data-index="${index}" title="削除">
                            <i data-lucide="trash-2"></i>
                        </button>
                    </div>
                </td>
            `;
        }
        tableBody.appendChild(tr);
    });

    lucide.createIcons();
    bindActionButtons();
}

// 各種ボタンのイベント登録
function bindActionButtons() {
    document.querySelectorAll('.date-header-row').forEach(header => {
        header.addEventListener('click', (e) => {
            if (e.target.closest('.delete-date-btn')) return;
            const targetDate = header.getAttribute('data-date');
            collapsedDates[targetDate] = !collapsedDates[targetDate];
            localStorage.setItem('collapsedDates', JSON.stringify(collapsedDates));
            renderTable();
        });
    });

    document.querySelectorAll('.delete-date-btn').forEach(button => {
        button.addEventListener('click', (e) => {
            e.stopPropagation();
            const targetDate = button.getAttribute('data-date');
            deleteDateRecords(targetDate);
        });
    });

    document.querySelectorAll('.edit-btn').forEach(button => {
        button.addEventListener('click', (e) => {
            e.stopPropagation();
            editingIndex = parseInt(button.getAttribute('data-index'));
            renderTable();
        });
    });

    document.querySelectorAll('.delete-btn').forEach(button => {
        button.addEventListener('click', (e) => {
            e.stopPropagation();
            const index = parseInt(button.getAttribute('data-index'));
            deleteRecord(index);
        });
    });

    document.querySelectorAll('.cancel-btn').forEach(button => {
        button.addEventListener('click', () => {
            editingIndex = -1;
            renderTable();
        });
    });

    document.querySelectorAll('.save-btn').forEach(button => {
        button.addEventListener('click', () => {
            const index = parseInt(button.getAttribute('data-index'));
            saveEdit(index);
        });
    });
}

async function deleteDateRecords(targetDate) {
    const formattedDate = formatDateLabel(targetDate);
    const ok = await showConfirm(
        '日付の一括削除',
        `${formattedDate} の記録をすべて削除しますか？\nこの操作は元に戻せません。`
    );

    if (ok) {
        records = records.filter(record => record.date !== targetDate);
        localStorage.setItem('trainRecords', JSON.stringify(records));
        if (collapsedDates[targetDate] !== undefined) {
            delete collapsedDates[targetDate];
            localStorage.setItem('collapsedDates', JSON.stringify(collapsedDates));
        }
        renderTable();
        showToast(`${formattedDate} の記録を削除しました`);
    }
}

function saveEdit(index) {
    const depStation = document.getElementById('edit_depStation').value.trim();
    const time = document.getElementById('edit_time').value;
    const arrStation = document.getElementById('edit_arrStation').value.trim();
    const depDelay = document.getElementById('edit_depDelay').value;
    const arrDelay = document.getElementById('edit_arrDelay').value;
    const trainNum = document.getElementById('edit_trainNum').value.trim();
    const memo = document.getElementById('edit_memo').value.trim();

    if (!depStation || !time || !arrStation) {
        showToast('乗車駅・時刻・下車駅は必須です');
        return;
    }

    records[index] = {
        ...records[index],
        depStation, time, arrStation, depDelay, arrDelay, trainNum, memo
    };

    localStorage.setItem('trainRecords', JSON.stringify(records));
    editingIndex = -1;
    renderTable();
    showToast('記録を更新しました');
}

function escapeHTML(str) {
    if (!str) return '';
    return String(str).replace(/[&<>"']/g, match => ({
        '&': '&', '<': '<', '>': '>', '"': '"', "'": '''
    }[match]));
}

document.getElementById('addBtn').addEventListener('click', () => {
    const date = document.getElementById('date').value;
    const depStation = document.getElementById('depStation').value.trim();
    const time = document.getElementById('time').value;
    const arrStation = document.getElementById('arrStation').value.trim();
    const depDelay = document.getElementById('depDelay').value;
    const arrDelay = document.getElementById('arrDelay').value;
    const trainNum = document.getElementById('trainNum').value.trim();
    const memo = document.getElementById('memo').value.trim();

    if (!date || !depStation || !time || !arrStation) {
        showToast('日付・乗車駅・時刻・下車駅を入力してください');
        return;
    }

    const newRecord = { date, depStation, time, arrStation, depDelay, arrDelay, trainNum, memo };
    records.push(newRecord);
    localStorage.setItem('trainRecords', JSON.stringify(records));
    
    renderTable();
    clearForm();
    showToast('乗車記録を追加しました');
});

async function deleteRecord(index) {
    const target = records[index];
    const ok = await showConfirm(
        '記録の削除',
        `${target.depStation} → ${target.arrStation}（${target.time}発）の記録を削除しますか？`
    );
    if (ok) {
        records.splice(index, 1);
        localStorage.setItem('trainRecords', JSON.stringify(records));
        renderTable();
        showToast('記録を削除しました');
    }
}

function downloadCSV(targetRecords, fileNameKeyword) {
    let csvContent = '日付,乗車駅,時刻,下車駅,遅延(発),遅延(着),編成番号,メモ\r\n';

    targetRecords.forEach(record => {
        const row = [
            `"${record.date}"`,
            `"${record.depStation.replace(/"/g, '""')}"`,
            `"${record.time}"`,
            `"${record.arrStation.replace(/"/g, '""')}"`,
            `"${record.depDelay || 0}"`,
            `"${record.arrDelay || 0}"`,
            `"${(record.trainNum || '').replace(/"/g, '""')}"`,
            `"${(record.memo || '').replace(/"/g, '""')}"`
        ].join(',');
        csvContent += row + '\r\n';
    });

    const bom = new Uint8Array([0xEF, 0xBB, 0xBF]);
    const blob = new Blob([bom, csvContent], { type: 'text/csv;charset=utf-8;' });
    
    const link = document.createElement('a');
    link.setAttribute('href', URL.createObjectURL(blob));
    link.setAttribute('download', `train_records_${fileNameKeyword}.csv`);
    link.click();
    showToast('CSVをダウンロードしました');
}

document.getElementById('downloadBtn').addEventListener('click', () => {
    if (records.length === 0) return showToast('ダウンロードする記録がありません');
    sortRecords();
    const now = new Date();
    const dateStr = now.getFullYear() + String(now.getMonth() + 1).padStart(2, '0') + String(now.getDate()).padStart(2, '0');
    downloadCSV(records, `all_${dateStr}`);
});

document.getElementById('downloadDateBtn').addEventListener('click', () => {
    const selectedDate = document.getElementById('date').value;
    if (!selectedDate) return showToast('日付を選択してください');

    const filteredRecords = records.filter(record => record.date === selectedDate);
    if (filteredRecords.length === 0) return showToast(`${selectedDate} の記録はありません`);

    filteredRecords.sort((a, b) => a.time.localeCompare(b.time));
    downloadCSV(filteredRecords, selectedDate.replace(/-/g, ''));
});

document.getElementById('uploadFile').addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function(event) {
        const lines = event.target.result.split(/\r\n|\n/);
        let importCount = 0;

        for (let i = 1; i < lines.length; i++) {
            const line = lines[i].trim();
            if (!line) continue;
            const row = parseCSVLine(line);
            if (row.length < 4) continue;

            const date = row[0];
            const depStation = row[1];
            const time = row[2];
            const arrStation = row[3];

            if (date && depStation && time && arrStation) {
                records.push({
                    date, depStation, time, arrStation,
                    depDelay: row[4] || "0", arrDelay: row[5] || "0",
                    trainNum: row[6] || "", memo: row[7] || ""
                });
                importCount++;
            }
        }

        if (importCount > 0) {
            localStorage.setItem('trainRecords', JSON.stringify(records));
            renderTable();
            showToast(`${importCount}件の記録をインポートしました`);
        } else {
            showToast('有効なデータが見つかりませんでした');
        }
        document.getElementById('uploadFile').value = '';
    };
    reader.readAsText(file);
});

function parseCSVLine(line) {
    const result = [];
    let current = '';
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
        const char = line[i];
        if (char === '"') {
            if (inQuotes && line[i + 1] === '"') { current += '"'; i++; }
            else { inQuotes = !inQuotes; }
        } else if (char === ',' && !inQuotes) { result.push(current); current = ''; }
        else { current += char; }
    }
    result.push(current);
    return result;
}

function clearForm() {
    setTodayDate();
    document.getElementById('depStation').value = '';
    document.getElementById('time').value = '';
    document.getElementById('arrStation').value = '';
    document.getElementById('depDelay').value = '0';
    document.getElementById('arrDelay').value = '0';
    document.getElementById('trainNum').value = '';
    document.getElementById('memo').value = '';
}

// Service Worker 登録（PWA対応）
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('sw.js').then(reg => {
            reg.addEventListener('updatefound', () => {
                const newWorker = reg.installing;
                if (newWorker == null) return;
                newWorker.addEventListener('statechange', () => {
                    if (newWorker.state === 'installed') {
                        if (navigator.serviceWorker.controller) {
                            if (!sessionStorage.getItem('pwa_update_prompted')) {
                                sessionStorage.setItem('pwa_update_prompted', 'true');
                                if (confirm('新しいバージョンが利用可能です。アップデートして最新の状態にしますか？')) {
                                    newWorker.postMessage({ type: 'SKIP_WAITING' });
                                } else {
                                    sessionStorage.removeItem('pwa_update_prompted');
                                }
                            }
                        }
                    }
                });
            });
        }).catch(err => {
            console.error('Service Workerの登録に失敗しました:', err);
        });
    });

    let refreshing = false;
    navigator.serviceWorker.addEventListener('controllerchange', () => {
        if (refreshing) return;
        refreshing = true;
        sessionStorage.removeItem('pwa_update_prompted');
        window.location.reload();
    });
}

// テーマ切り替え
const themeToggle = document.getElementById('themeToggle');
const currentTheme = localStorage.getItem('theme') || 'light';

function applyTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    const iconName = theme === 'dark' ? 'sun' : 'moon';
    themeToggle.innerHTML = `<i data-lucide="${iconName}"></i>`;
    lucide.createIcons();
}

applyTheme(currentTheme);

themeToggle.addEventListener('click', () => {
    const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
    const nextTheme = isDark ? 'light' : 'dark';
    localStorage.setItem('theme', nextTheme);
    applyTheme(nextTheme);
});

// 初期化実行
setTodayDate();
renderTable();
