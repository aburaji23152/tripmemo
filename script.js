// アイコン初期化
lucide.createIcons();

// データの読み込みと初期化（localStorageから取得）
const tableBody = document.getElementById('tableBody');
const recordCountBadge = document.getElementById('recordCountBadge');
let records = JSON.parse(localStorage.getItem('trainRecords')) || [];

// 折りたたみ状態をlocalStorageから読み込む
let collapsedDates = JSON.parse(localStorage.getItem('collapsedDates')) || {};

// 編集中の行のインデックス（-1は編集モードなし）
let editingIndex = -1;

// --- トースト通知機能（alertの代替） ---
function showToast(message, type = 'info') {
    const container = document.getElementById('toastContainer');
    const toast = document.createElement('div');
    
    const styles = {
        success: 'bg-slate-900 dark:bg-emerald-950 text-white border-emerald-500/40',
        error: 'bg-rose-600 text-white border-rose-400/40',
        info: 'bg-slate-800 text-white border-slate-700'
    };
    const icons = {
        success: 'check-circle',
        error: 'alert-circle',
        info: 'info'
    };

    toast.className = `toast-enter flex items-center gap-2.5 px-4 py-3 rounded-xl shadow-lg border text-sm font-medium ${styles[type] || styles.info}`;
    toast.innerHTML = `
        <i data-lucide="${icons[type] || icons.info}" class="w-4 h-4 shrink-0 ${type === 'success' ? 'text-emerald-400' : ''}"></i>
        <span>${escapeHTML(message)}</span>
    `;
    container.appendChild(toast);
    lucide.createIcons({ root: toast });

    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transform = 'translateY(10px)';
        toast.style.transition = 'all 0.25s ease';
        setTimeout(() => toast.remove(), 250);
    }, 3000);
}

// --- カスタム確認ダイアログ（confirmの代替） ---
function showConfirm(title, message, confirmLabel = '削除する', confirmClass = 'bg-rose-600 hover:bg-rose-700') {
    return new Promise((resolve) => {
        const modal = document.getElementById('confirmModal');
        const titleEl = document.getElementById('modalTitle');
        const msgEl = document.getElementById('modalMessage');
        const cancelBtn = document.getElementById('modalCancelBtn');
        const confirmBtn = document.getElementById('modalConfirmBtn');

        titleEl.textContent = title;
        msgEl.textContent = message;
        confirmBtn.textContent = confirmLabel;
        confirmBtn.className = `px-4 py-2 rounded-xl text-sm font-semibold text-white shadow-sm transition-colors cursor-pointer ${confirmClass}`;

        modal.classList.remove('hidden');
        modal.classList.add('flex');

        const cleanup = (result) => {
            modal.classList.add('hidden');
            modal.classList.remove('flex');
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

// 今日のおおよその日付（ローカルタイム）をフォームの初期値にする
function setTodayDate() {
    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const dd = String(today.getDate()).padStart(2, '0');
    document.getElementById('date').value = `${yyyy}-${mm}-${dd}`;
}

// データを【開閉状態】＞【日付順】＞【時刻順】にソートする関数
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

// 遅延バッジのHTML生成
function formatDelayBadge(val) {
    if (val >= 1) {
        return `<span class="inline-flex items-center justify-center px-2 py-0.5 rounded-full text-xs font-bold bg-rose-100 text-rose-700 dark:bg-rose-950/80 dark:text-rose-300 border border-rose-200/80 dark:border-rose-800/60">+${val}</span>`;
    }
    return `<span class="text-slate-400 dark:text-slate-500 text-xs">0</span>`;
}

// テーブルの描画処理
function renderTable() {
    tableBody.innerHTML = '';
    recordCountBadge.textContent = `${records.length}件`;

    if (records.length === 0) {
        tableBody.innerHTML = `
            <tr>
                <td colspan="8" class="py-12 px-4 text-center">
                    <div class="flex flex-col items-center justify-center text-slate-400 dark:text-slate-500">
                        <i data-lucide="train" class="w-10 h-10 mb-2 opacity-40"></i>
                        <p class="text-sm font-medium">記録がありません</p>
                        <p class="text-xs mt-1">上のフォームから新しい乗車記録を追加してください</p>
                    </div>
                </td>
            </tr>`;
        lucide.createIcons({ root: tableBody });
        return;
    }

    if (editingIndex === -1) {
        sortRecords();
    }

    let currentScaleDate = '';

    records.forEach((record, index) => {
        // 日付の見出し行（アコーディオンバー）
        if (record.date !== currentScaleDate) {
            currentScaleDate = record.date;
            
            // タイムゾーンずれ防止のためYYYY-MM-DDを分割して整形
            const parts = record.date.split('-');
            const formattedDate = parts.length === 3 
                ? `${parts[0]}年${parseInt(parts[1], 10)}月${parseInt(parts[2], 10)}日`
                : record.date;

            // その日の件数をカウント
            const dayCount = records.filter(r => r.date === record.date).length;
            const isCollapsed = collapsedDates[record.date] || false;

            const dateRow = document.createElement('tr');
            dateRow.className = 'date-header-row group select-none cursor-pointer transition-colors ' + 
                (isCollapsed 
                    ? 'bg-slate-100/80 dark:bg-slate-800/40 text-slate-500 dark:text-slate-400' 
                    : 'bg-indigo-50/70 dark:bg-indigo-950/30 text-indigo-950 dark:text-indigo-200');
            dateRow.setAttribute('data-date', record.date);
            
            dateRow.innerHTML = `
                <td colspan="8" class="py-2.5 px-4">
                    <div class="flex items-center justify-between">
                        <div class="flex items-center gap-2">
                            <span class="w-6 h-6 rounded-lg flex items-center justify-center bg-white/80 dark:bg-slate-800 shadow-2xs transition-transform duration-200 ${isCollapsed ? '' : 'rotate-90'}">
                                <i data-lucide="chevron-right" class="w-4 h-4 text-indigo-600 dark:text-indigo-400"></i>
                            </span>
                            <i data-lucide="calendar" class="w-4 h-4 text-indigo-500 dark:text-indigo-400"></i>
                            <span class="font-bold text-sm tracking-tight">${formattedDate}</span>
                            <span class="text-xs font-medium px-2 py-0.5 rounded-full bg-white/80 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                                ${dayCount}本
                            </span>
                            ${isCollapsed ? '<span class="text-[11px] text-slate-400 dark:text-slate-500 ml-1">(折りたたみ中・下部へ移動)</span>' : ''}
                        </div>
                        <button class="delete-date-btn inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium text-rose-600 dark:text-rose-400 hover:bg-rose-100/80 dark:hover:bg-rose-950/60 transition-colors cursor-pointer" data-date="${record.date}">
                            <i data-lucide="trash-2" class="w-3.5 h-3.5 pointer-events-none"></i>
                            <span>この日を削除</span>
                        </button>
                    </div>
                </td>
            `;
            tableBody.appendChild(dateRow);
        }

        const tr = document.createElement('tr');
        tr.className = 'hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors';
        
        if (collapsedDates[record.date]) {
            tr.classList.add('hidden-row');
        }

        const depDelayVal = parseInt(record.depDelay) || 0;
        const arrDelayVal = parseInt(record.arrDelay) || 0;

        if (editingIndex === index) {
            tr.className = 'bg-indigo-50/40 dark:bg-indigo-950/20';
            tr.innerHTML = `
                <td class="py-2.5 px-3"><input type="text" id="edit_depStation" value="${escapeHTML(record.depStation)}" class="w-full px-2.5 py-1.5 text-xs bg-white dark:bg-slate-800 border border-indigo-300 dark:border-indigo-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"></td>
                <td class="py-2.5 px-2"><input type="time" id="edit_time" value="${escapeHTML(record.time)}" class="w-full px-2 py-1.5 text-xs bg-white dark:bg-slate-800 border border-indigo-300 dark:border-indigo-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"></td>
                <td class="py-2.5 px-3"><input type="text" id="edit_arrStation" value="${escapeHTML(record.arrStation)}" class="w-full px-2.5 py-1.5 text-xs bg-white dark:bg-slate-800 border border-indigo-300 dark:border-indigo-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"></td>
                <td class="py-2.5 px-1.5"><input type="number" id="edit_depDelay" value="${depDelayVal}" min="0" class="w-14 px-1.5 py-1.5 text-xs text-center bg-white dark:bg-slate-800 border border-indigo-300 dark:border-indigo-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"></td>
                <td class="py-2.5 px-1.5"><input type="number" id="edit_arrDelay" value="${arrDelayVal}" min="0" class="w-14 px-1.5 py-1.5 text-xs text-center bg-white dark:bg-slate-800 border border-indigo-300 dark:border-indigo-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"></td>
                <td class="py-2.5 px-2"><input type="text" id="edit_trainNum" value="${escapeHTML(record.trainNum)}" class="w-24 px-2 py-1.5 text-xs text-center bg-white dark:bg-slate-800 border border-indigo-300 dark:border-indigo-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"></td>
                <td class="py-2.5 px-3"><input type="text" id="edit_memo" value="${escapeHTML(record.memo)}" class="w-full px-2.5 py-1.5 text-xs bg-white dark:bg-slate-800 border border-indigo-300 dark:border-indigo-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"></td>
                <td class="py-2.5 px-4 text-right whitespace-nowrap">
                    <div class="inline-flex items-center gap-1.5">
                        <button class="save-btn px-2.5 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-semibold transition-colors cursor-pointer" data-index="${index}">保存</button>
                        <button class="cancel-btn px-2.5 py-1.5 rounded-lg bg-slate-200 hover:bg-slate-300 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 text-xs font-semibold transition-colors cursor-pointer">中止</button>
                    </div>
                </td>
            `;
        } else {
            tr.innerHTML = `
                <td class="py-3 px-4 font-semibold text-slate-800 dark:text-slate-100">${escapeHTML(record.depStation)}</td>
                <td class="py-3 px-3 text-center font-mono text-xs font-medium text-slate-600 dark:text-slate-300">${escapeHTML(record.time)}</td>
                <td class="py-3 px-4 font-semibold text-slate-800 dark:text-slate-100">${escapeHTML(record.arrStation)}</td>
                <td class="py-3 px-2 text-center">${formatDelayBadge(depDelayVal)}</td>
                <td class="py-3 px-2 text-center">${formatDelayBadge(arrDelayVal)}</td>
                <td class="py-3 px-3 text-center">
                    ${record.trainNum ? `<span class="inline-block px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-medium">${escapeHTML(record.trainNum)}</span>` : '<span class="text-slate-300 dark:text-slate-600">-</span>'}
                </td>
                <td class="py-3 px-4 text-xs text-slate-600 dark:text-slate-400 max-w-[200px] truncate" title="${escapeHTML(record.memo)}">${escapeHTML(record.memo) || '<span class="text-slate-300 dark:text-slate-600">-</span>'}</td>
                <td class="py-3 px-4 text-right whitespace-nowrap">
                    <div class="inline-flex items-center gap-1">
                        <button class="edit-btn p-1.5 rounded-lg text-slate-500 hover:text-amber-600 hover:bg-amber-50 dark:text-slate-400 dark:hover:text-amber-400 dark:hover:bg-amber-950/50 transition-colors cursor-pointer" data-index="${index}" title="編集">
                            <i data-lucide="pencil" class="w-4 h-4 pointer-events-none"></i>
                        </button>
                        <button class="delete-btn p-1.5 rounded-lg text-slate-500 hover:text-rose-600 hover:bg-rose-50 dark:text-slate-400 dark:hover:text-rose-400 dark:hover:bg-rose-950/50 transition-colors cursor-pointer" data-index="${index}" title="削除">
                            <i data-lucide="trash-2" class="w-4 h-4 pointer-events-none"></i>
                        </button>
                    </div>
                </td>
            `;
        }
        tableBody.appendChild(tr);
    });

    lucide.createIcons({ root: tableBody });
    bindActionButtons();
}

// 各種ボタンのイベント登録
function bindActionButtons() {
    document.querySelectorAll('.date-header-row').forEach(header => {
        header.addEventListener('click', (e) => {
            if (e.target.closest('.delete-date-btn')) return;
            
            const targetDate = header.getAttribute('data-date');
            collapsedDates[targetDate] = !collapsedDates[targetDate];
            
            // 開閉状態をlocalStorageに保存
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
    const parts = targetDate.split('-');
    const formattedDate = parts.length === 3 
        ? `${parts[0]}年${parseInt(parts[1], 10)}月${parseInt(parts[2], 10)}日`
        : targetDate;

    const confirmed = await showConfirm(
        '日別記録の一括削除',
        `${formattedDate} の記録を「すべて」削除しますか？\nこの操作は元に戻せません。`
    );

    if (confirmed) {
        records = records.filter(record => record.date !== targetDate);
        localStorage.setItem('trainRecords', JSON.stringify(records));
        
        if (collapsedDates[targetDate] !== undefined) {
            delete collapsedDates[targetDate];
            localStorage.setItem('collapsedDates', JSON.stringify(collapsedDates));
        }
        
        renderTable();
        showToast(`${formattedDate} の記録を一括削除しました`, 'success');
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
        showToast('乗車駅、時刻、下車駅は必須入力です', 'error');
        return;
    }

    records[index] = {
        ...records[index],
        depStation, time, arrStation, depDelay, arrDelay, trainNum, memo
    };

    localStorage.setItem('trainRecords', JSON.stringify(records));
    editingIndex = -1;
    renderTable();
    showToast('記録を更新しました', 'success');
}

function escapeHTML(str) {
    if (!str) return '';
    return String(str).replace(/[&<>"']/g, match => ({
        '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    }[match]));
}

document.getElementById('addBtn').addEventListener('click', () => {
    const date = document.getElementById('date').value;
    const depStation = document.getElementById('depStation').value.trim();
    const time = document.getElementById('time').value;
    const arrStation = document.getElementById('arrStation').value.trim();
    const depDelay = document.getElementById('depDelay').value || '0';
    const arrDelay = document.getElementById('arrDelay').value || '0';
    const trainNum = document.getElementById('trainNum').value.trim();
    const memo = document.getElementById('memo').value.trim();

    if (!date || !depStation || !time || !arrStation) {
        showToast('日付、乗車駅、時刻、下車駅は必須入力です', 'error');
        return;
    }

    const newRecord = { date, depStation, time, arrStation, depDelay, arrDelay, trainNum, memo };
    records.push(newRecord);
    localStorage.setItem('trainRecords', JSON.stringify(records));
    
    renderTable();
    clearForm();
    showToast('乗車記録を追加しました', 'success');
});

async function deleteRecord(index) {
    const confirmed = await showConfirm('記録の削除', 'この乗車記録を削除しますか？');
    if (confirmed) {
        records.splice(index, 1);
        localStorage.setItem('trainRecords', JSON.stringify(records));
        renderTable();
        showToast('記録を削除しました', 'success');
    }
}

function downloadCSV(targetRecords, fileNameKeyword) {
    let csvContent = '日付,乗車駅,時刻,下車駅,遅延(発),遅延(着),編成番号,メモ\r\n';

    targetRecords.forEach(record => {
        const row = [
            `"${record.date}"`,
            `"${(record.depStation || '').replace(/"/g, '""')}"`,
            `"${record.time}"`,
            `"${(record.arrStation || '').replace(/"/g, '""')}"`,
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
    showToast('CSVファイルをダウンロードしました', 'success');
}

document.getElementById('downloadBtn').addEventListener('click', () => {
    if (records.length === 0) return showToast('ダウンロードする記録がありません', 'error');
    sortRecords();
    const now = new Date();
    const dateStr = now.getFullYear() + String(now.getMonth() + 1).padStart(2, '0') + String(now.getDate()).padStart(2, '0');
    downloadCSV(records, `all_${dateStr}`);
});

document.getElementById('downloadDateBtn').addEventListener('click', () => {
    const selectedDate = document.getElementById('date').value;
    if (!selectedDate) return showToast('日付を選択してください', 'error');

    const filteredRecords = records.filter(record => record.date === selectedDate);
    if (filteredRecords.length === 0) return showToast(`${selectedDate} の記録はありません`, 'error');

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
            showToast(`${importCount}件の記録をインポートしました！`, 'success');
        } else {
            showToast('有効なデータが見つかりませんでした', 'error');
        }
        document.getElementById('uploadFile').value = '';
    };
    reader.readAsText(file);
});

function parseCSVLine(line) {
    const result = []; let current = ''; let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
        const char = line[i];
        if (char === '"') {
            if (inQuotes && line[i + 1] === '"') { current += '"'; i++; }
            else { inQuotes = !inQuotes; }
        } else if (char === ',' && !inQuotes) { result.push(current); current = ''; }
        else { current += char; }
    }
    result.push(current); return result;
}

function clearForm() {
    // 日付は連続入力しやすいよう維持し、駅名や時刻などをリセット
    document.getElementById('depStation').value = '';
    document.getElementById('time').value = '';
    document.getElementById('arrStation').value = '';
    document.getElementById('depDelay').value = '0';
    document.getElementById('arrDelay').value = '0';
    document.getElementById('trainNum').value = '';
    document.getElementById('memo').value = '';
}

// 初期表示セットアップ
setTodayDate();
renderTable();

// ダークモード切り替え（Tailwindのclass方式に対応）
const themeToggle = document.getElementById('themeToggle');
const currentTheme = localStorage.getItem('theme') || 'light';

if (currentTheme === 'dark') {
    document.documentElement.classList.add('dark');
}

themeToggle.addEventListener('click', () => {
    const isDark = document.documentElement.classList.toggle('dark');
    localStorage.setItem('theme', isDark ? 'dark' : 'light');
});
