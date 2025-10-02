// Global application state
const StepsTracker = {
    participants: ["Del", "Giem", "Glaiz", "Jeun", "Joy", "Kokoy", "Leanne", "Lui", "Ramon", "Robert", "Sarah", "Sheila", "Shin", "Yohan", "Zephanny", "Sam"],
    targetSteps: 10000,
    penaltyAmount: 50,
    currency: 'PHP',
    adminPassword: 'steps2025',
    
    // Data storage
    entries: [],
    payments: {},
    
    // Admin state
    isAdminMode: false,
    editingEntry: null,
    confirmCallback: null,
    
    // Initialize the application
    init() {
        this.loadData();
        this.setupEventListeners();
        this.setDefaultDate();
        this.updateAllDisplays();
        this.setParticipantMode(); // Start in participant mode
    },
    
    // Data Management
    loadData() {
        const saved = localStorage.getItem('stepsTrackerData');
        if (saved) {
            try {
                const data = JSON.parse(saved);
                this.entries = data.entries || [];
                this.payments = data.payments || {};
            } catch (e) {
                console.error('Error loading data:', e);
                this.showMessage('Error loading saved data. Starting fresh.', 'error');
            }
        }
    },
    
    saveData() {
        const data = {
            entries: this.entries,
            payments: this.payments,
            timestamp: new Date().toISOString()
        };
        localStorage.setItem('stepsTrackerData', JSON.stringify(data));
    },
    
    // Authentication
    setAdminMode() {
        this.isAdminMode = true;
        document.body.classList.add('admin-mode');
        document.getElementById('admin-indicator').classList.remove('hidden');
        document.getElementById('admin-toggle').textContent = '🔓 Exit Admin Mode';
        this.updateAllDisplays();
    },
    
    setParticipantMode() {
        this.isAdminMode = false;
        document.body.classList.remove('admin-mode');
        document.getElementById('admin-indicator').classList.add('hidden');
        document.getElementById('admin-toggle').textContent = '🔐 Enable Admin Mode';
        this.updateAllDisplays();
    },
    
    promptAdminPassword() {
        document.getElementById('password-modal').classList.remove('hidden');
        document.getElementById('admin-password').value = '';
        document.getElementById('admin-password').focus();
    },
    
    validateAdminPassword(password) {
        return password === this.adminPassword;
    },
    
    // Entry Management
    addEntry(participant, date, steps, proofFile) {
        // Check for duplicates
        const duplicate = this.entries.find(entry => 
            entry.participant === participant && entry.date === date
        );
        
        if (duplicate) {
            this.showMessage('Entry already exists for this participant and date. Use edit to modify.', 'error');
            return false;
        }
        
        const entry = {
            id: Date.now().toString(),
            participant,
            date,
            steps: parseInt(steps),
            proof: proofFile ? proofFile.name : null,
            proofData: proofFile ? URL.createObjectURL(proofFile) : null,
            timestamp: new Date().toISOString()
        };
        
        this.entries.push(entry);
        this.saveData();
        this.updateAllDisplays();
        return true;
    },
    
    editEntry(id, newSteps) {
        const entry = this.entries.find(e => e.id === id);
        if (entry) {
            entry.steps = parseInt(newSteps);
            this.saveData();
            this.updateAllDisplays();
            return true;
        }
        return false;
    },
    
    deleteEntry(id) {
        const index = this.entries.findIndex(e => e.id === id);
        if (index > -1) {
            this.entries.splice(index, 1);
            this.saveData();
            this.updateAllDisplays();
            return true;
        }
        return false;
    },
    
    // Calculations
    calculateStatus(steps) {
        return steps >= this.targetSteps ? 'OK' : 'Missed';
    },
    
    calculateAmountOwed(steps) {
        return steps >= this.targetSteps ? 0 : this.penaltyAmount;
    },
    
    getParticipantSummary(participant) {
        const participantEntries = this.entries.filter(e => e.participant === participant);
        const totalDays = participantEntries.length;
        const daysMissed = participantEntries.filter(e => e.steps < this.targetSteps).length;
        const amountOwed = daysMissed * this.penaltyAmount;
        const completionRate = totalDays > 0 ? ((totalDays - daysMissed) / totalDays * 100) : 0;
        const isPaid = this.payments[participant] || false;
        
        return {
            totalDays,
            daysMissed,
            amountOwed,
            completionRate,
            isPaid
        };
    },
    
    // UI Management
    setupEventListeners() {
        // Tab navigation
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                this.switchTab(e.target.dataset.tab);
            });
        });
        
        // Form submission
        document.getElementById('submit-form').addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleFormSubmit();
        });
        
        // Admin toggle
        document.getElementById('admin-toggle').addEventListener('click', () => {
            if (this.isAdminMode) {
                this.setParticipantMode();
            } else {
                this.promptAdminPassword();
            }
        });
        
        // Password form
        document.getElementById('password-form').addEventListener('submit', (e) => {
            e.preventDefault();
            this.handlePasswordSubmit();
        });
        
        // Edit form
        document.getElementById('edit-form').addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleEditSubmit();
        });
        
        // Filters
        document.getElementById('name-filter').addEventListener('input', () => this.updateTrackerDisplay());
        document.getElementById('date-from').addEventListener('change', () => this.updateTrackerDisplay());
        document.getElementById('date-to').addEventListener('change', () => this.updateTrackerDisplay());
        document.getElementById('clear-filters').addEventListener('click', () => this.clearFilters());
        
        // Export buttons
        document.getElementById('export-tracker').addEventListener('click', () => this.exportTracker());
        document.getElementById('export-summary').addEventListener('click', () => this.exportSummary());
        
        // Admin controls
        document.getElementById('clear-all-data').addEventListener('click', () => this.clearAllData());
        document.getElementById('backup-data').addEventListener('click', () => this.backupData());
        document.getElementById('restore-data').addEventListener('click', () => this.restoreData());
        
        // Modal controls
        document.getElementById('close-password-modal').addEventListener('click', () => this.closePasswordModal());
        document.getElementById('cancel-password').addEventListener('click', () => this.closePasswordModal());
        document.getElementById('close-modal').addEventListener('click', () => this.closeModal());
        document.getElementById('cancel-edit').addEventListener('click', () => this.closeModal());
        document.getElementById('confirm-cancel').addEventListener('click', () => this.closeConfirmModal());
        document.getElementById('confirm-yes').addEventListener('click', () => this.confirmAction());
        
        // Close modals on background click
        document.getElementById('password-modal').addEventListener('click', (e) => {
            if (e.target.id === 'password-modal') this.closePasswordModal();
        });
        document.getElementById('edit-modal').addEventListener('click', (e) => {
            if (e.target.id === 'edit-modal') this.closeModal();
        });
        document.getElementById('confirm-modal').addEventListener('click', (e) => {
            if (e.target.id === 'confirm-modal') this.closeConfirmModal();
        });
    },
    
    switchTab(tabName) {
        // Update tab buttons
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.tab === tabName);
        });
        
        // Update tab content
        document.querySelectorAll('.tab-content').forEach(content => {
            content.classList.toggle('active', content.id === `${tabName}-tab`);
        });
        
        // Update displays when switching to tracker or summary
        if (tabName === 'tracker') {
            this.updateTrackerDisplay();
        } else if (tabName === 'summary') {
            this.updateSummaryDisplay();
        }
    },
    
    setDefaultDate() {
        const today = new Date().toISOString().split('T')[0];
        document.getElementById('date-input').value = today;
        document.getElementById('date-input').max = today;
    },
    
    handleFormSubmit() {
        const participant = document.getElementById('participant-select').value;
        const date = document.getElementById('date-input').value;
        const steps = document.getElementById('steps-input').value;
        const proofFile = document.getElementById('proof-upload').files[0];
        
        // Validation
        if (!participant || !date || !steps) {
            this.showMessage('Please fill in all required fields.', 'error');
            return;
        }
        
        if (parseInt(steps) < 0) {
            this.showMessage('Step count must be a positive number.', 'error');
            return;
        }
        
        if (new Date(date) > new Date()) {
            this.showMessage('Date cannot be in the future.', 'error');
            return;
        }
        
        if (this.addEntry(participant, date, steps, proofFile)) {
            this.showMessage(`Entry added successfully for ${participant}!`, 'success');
            this.clearForm();
        }
    },
    
    handlePasswordSubmit() {
        const password = document.getElementById('admin-password').value;
        
        if (this.validateAdminPassword(password)) {
            this.setAdminMode();
            this.closePasswordModal();
            this.showMessage('Admin mode activated!', 'success');
        } else {
            this.showMessage('Invalid password. Access denied.', 'error');
            document.getElementById('admin-password').value = '';
            document.getElementById('admin-password').focus();
        }
    },
    
    clearForm() {
        document.getElementById('submit-form').reset();
        this.setDefaultDate();
    },
    
    updateAllDisplays() {
        this.updateTrackerDisplay();
        this.updateSummaryDisplay();
        this.updateRecentEntries();
    },
    
    updateTrackerDisplay() {
        const tbody = document.getElementById('tracker-tbody');
        const nameFilter = document.getElementById('name-filter').value.toLowerCase();
        const dateFrom = document.getElementById('date-from').value;
        const dateTo = document.getElementById('date-to').value;
        
        let filteredEntries = [...this.entries];
        
        // Apply filters
        if (nameFilter) {
            filteredEntries = filteredEntries.filter(entry => 
                entry.participant.toLowerCase().includes(nameFilter)
            );
        }
        
        if (dateFrom) {
            filteredEntries = filteredEntries.filter(entry => entry.date >= dateFrom);
        }
        
        if (dateTo) {
            filteredEntries = filteredEntries.filter(entry => entry.date <= dateTo);
        }
        
        // Sort by date (newest first)
        filteredEntries.sort((a, b) => new Date(b.date) - new Date(a.date));
        
        const colSpan = this.isAdminMode ? '7' : '6';
        
        if (filteredEntries.length === 0) {
            tbody.innerHTML = `<tr class="empty-state"><td colspan="${colSpan}">No entries found.</td></tr>`;
        } else {
            tbody.innerHTML = filteredEntries.map(entry => {
                const status = this.calculateStatus(entry.steps);
                const amountOwed = this.calculateAmountOwed(entry.steps);
                
                let actionsColumn = '';
                if (this.isAdminMode) {
                    actionsColumn = `
                        <td>
                            <div class="action-buttons">
                                <button class="btn-edit" onclick="StepsTracker.openEditModal('${entry.id}')">Edit</button>
                                <button class="btn-delete" onclick="StepsTracker.confirmDelete('${entry.id}')">Delete</button>
                            </div>
                        </td>
                    `;
                }
                
                return `
                    <tr>
                        <td>${new Date(entry.date).toLocaleDateString()}</td>
                        <td>${entry.participant}</td>
                        <td>${entry.steps.toLocaleString()}</td>
                        <td><span class="status-${status.toLowerCase()}">${status}</span></td>
                        <td>${entry.proof ? `<img src="${entry.proofData}" alt="Proof" class="proof-image">` : '<span class="proof-text">No proof</span>'}</td>
                        <td>₱${amountOwed}</td>
                        ${actionsColumn}
                    </tr>
                `;
            }).join('');
        }
        
        // Update summary
        const totalEntries = filteredEntries.length;
        const totalOwed = filteredEntries.reduce((sum, entry) => sum + this.calculateAmountOwed(entry.steps), 0);
        
        document.getElementById('total-entries').textContent = totalEntries;
        document.getElementById('total-owed').textContent = `₱${totalOwed}`;
    },
    
    updateSummaryDisplay() {
        const tbody = document.getElementById('summary-tbody');
        
        if (this.entries.length === 0) {
            const colSpan = this.isAdminMode ? '6' : '5';
            tbody.innerHTML = `<tr class="empty-state"><td colspan="${colSpan}">No data available yet.</td></tr>`;
        } else {
            const summaries = this.participants.map(participant => {
                const summary = this.getParticipantSummary(participant);
                return { participant, ...summary };
            }).filter(s => s.totalDays > 0);
            
            tbody.innerHTML = summaries.map(summary => {
                let paymentColumn = '';
                if (this.isAdminMode) {
                    paymentColumn = `
                        <td>
                            <label class="payment-toggle">
                                <input type="checkbox" ${summary.isPaid ? 'checked' : ''} 
                                       onchange="StepsTracker.togglePayment('${summary.participant}')">
                                <span class="payment-slider"></span>
                                <span class="payment-status ${summary.isPaid ? 'paid' : 'unpaid'}">
                                    ${summary.isPaid ? 'Paid' : 'Unpaid'}
                                </span>
                            </label>
                        </td>
                    `;
                }
                
                return `
                    <tr>
                        <td>${summary.participant}</td>
                        <td>${summary.totalDays}</td>
                        <td>${summary.daysMissed}</td>
                        <td>₱${summary.amountOwed}</td>
                        <td>
                            <div class="progress-bar">
                                <div class="progress-fill" style="width: ${summary.completionRate}%"></div>
                            </div>
                            <div class="progress-text">${summary.completionRate.toFixed(1)}%</div>
                        </td>
                        ${paymentColumn}
                    </tr>
                `;
            }).join('');
        }
        
        // Update grand totals
        const grandTotalOwed = this.participants.reduce((total, participant) => {
            return total + this.getParticipantSummary(participant).amountOwed;
        }, 0);
        
        const totalCollected = this.participants.reduce((total, participant) => {
            const summary = this.getParticipantSummary(participant);
            return total + (summary.isPaid ? summary.amountOwed : 0);
        }, 0);
        
        document.getElementById('grand-total-owed').textContent = `₱${grandTotalOwed}`;
        document.getElementById('total-collected').textContent = `₱${totalCollected}`;
    },
    
    updateRecentEntries() {
        const container = document.getElementById('recent-entries-list');
        const recentEntries = [...this.entries]
            .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
            .slice(0, 10);
        
        if (recentEntries.length === 0) {
            container.innerHTML = '<p class="empty-text">No recent entries</p>';
        } else {
            container.innerHTML = recentEntries.map(entry => `
                <div class="recent-entry">
                    <strong>${entry.participant}</strong> - ${entry.steps.toLocaleString()} steps on ${new Date(entry.date).toLocaleDateString()}
                    <span class="status-${this.calculateStatus(entry.steps).toLowerCase()}">${this.calculateStatus(entry.steps)}</span>
                </div>
            `).join('');
        }
    },
    
    // Modal Management
    closePasswordModal() {
        document.getElementById('password-modal').classList.add('hidden');
    },
    
    openEditModal(entryId) {
        if (!this.isAdminMode) {
            this.showMessage('Admin access required to edit entries.', 'error');
            return;
        }
        
        const entry = this.entries.find(e => e.id === entryId);
        if (entry) {
            this.editingEntry = entry;
            document.getElementById('edit-steps').value = entry.steps;
            document.getElementById('edit-modal').classList.remove('hidden');
        }
    },
    
    closeModal() {
        document.getElementById('edit-modal').classList.add('hidden');
        this.editingEntry = null;
    },
    
    handleEditSubmit() {
        const newSteps = document.getElementById('edit-steps').value;
        
        if (!newSteps || parseInt(newSteps) < 0) {
            this.showMessage('Please enter a valid step count.', 'error');
            return;
        }
        
        if (this.editingEntry && this.editEntry(this.editingEntry.id, newSteps)) {
            this.showMessage('Entry updated successfully!', 'success');
            this.closeModal();
        }
    },
    
    // Confirmation Modal
    confirmDelete(entryId) {
        if (!this.isAdminMode) {
            this.showMessage('Admin access required to delete entries.', 'error');
            return;
        }
        
        const entry = this.entries.find(e => e.id === entryId);
        if (entry) {
            this.showConfirmation(
                `Are you sure you want to delete the entry for ${entry.participant} on ${new Date(entry.date).toLocaleDateString()}?`,
                () => {
                    if (this.deleteEntry(entryId)) {
                        this.showMessage('Entry deleted successfully!', 'success');
                    }
                }
            );
        }
    },
    
    showConfirmation(message, callback) {
        document.getElementById('confirm-message').textContent = message;
        document.getElementById('confirm-modal').classList.remove('hidden');
        this.confirmCallback = callback;
    },
    
    closeConfirmModal() {
        document.getElementById('confirm-modal').classList.add('hidden');
        this.confirmCallback = null;
    },
    
    confirmAction() {
        if (this.confirmCallback) {
            this.confirmCallback();
            this.confirmCallback = null;
        }
        this.closeConfirmModal();
    },
    
    // Payment Management
    togglePayment(participant) {
        if (!this.isAdminMode) {
            this.showMessage('Admin access required to manage payments.', 'error');
            return;
        }
        
        this.payments[participant] = !this.payments[participant];
        this.saveData();
        this.updateSummaryDisplay();
    },
    
    // Utility Functions
    clearFilters() {
        document.getElementById('name-filter').value = '';
        document.getElementById('date-from').value = '';
        document.getElementById('date-to').value = '';
        this.updateTrackerDisplay();
    },
    
    showMessage(text, type) {
        const container = document.getElementById('message-container');
        container.textContent = text;
        container.className = `message-container ${type}`;
        container.classList.remove('hidden');
        
        setTimeout(() => {
            container.classList.add('hidden');
        }, 5000);
    },
    
    // Export Functions
    exportTracker() {
        if (!this.isAdminMode) {
            this.showMessage('Admin access required to export data.', 'error');
            return;
        }
        
        const headers = ['Date', 'Name', 'Steps', 'Status', 'Amount Owed'];
        const rows = this.entries.map(entry => [
            entry.date,
            entry.participant,
            entry.steps,
            this.calculateStatus(entry.steps),
            this.calculateAmountOwed(entry.steps)
        ]);
        
        this.downloadCSV('daily-tracker.csv', [headers, ...rows]);
    },
    
    exportSummary() {
        if (!this.isAdminMode) {
            this.showMessage('Admin access required to export data.', 'error');
            return;
        }
        
        const headers = ['Name', 'Total Days', 'Days Missed', 'Amount Owed', 'Completion Rate', 'Payment Status'];
        const rows = this.participants
            .map(participant => {
                const summary = this.getParticipantSummary(participant);
                return [
                    participant,
                    summary.totalDays,
                    summary.daysMissed,
                    summary.amountOwed,
                    `${summary.completionRate.toFixed(1)}%`,
                    summary.isPaid ? 'Paid' : 'Unpaid'
                ];
            })
            .filter(row => row[1] > 0);
        
        this.downloadCSV('payment-summary.csv', [headers, ...rows]);
    },
    
    downloadCSV(filename, data) {
        const csv = data.map(row => row.join(',')).join('\n');
        const blob = new Blob([csv], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        a.click();
        
        URL.revokeObjectURL(url);
    },
    
    // Admin Functions
    clearAllData() {
        if (!this.isAdminMode) {
            this.showMessage('Admin access required to clear data.', 'error');
            return;
        }
        
        this.showConfirmation(
            'Are you sure you want to clear ALL data? This action cannot be undone.',
            () => {
                this.showConfirmation(
                    'This will permanently delete all entries and payment records. Are you absolutely sure?',
                    () => {
                        this.entries = [];
                        this.payments = {};
                        this.saveData();
                        this.updateAllDisplays();
                        this.showMessage('All data cleared successfully!', 'success');
                    }
                );
            }
        );
    },
    
    backupData() {
        if (!this.isAdminMode) {
            this.showMessage('Admin access required to backup data.', 'error');
            return;
        }
        
        const data = {
            entries: this.entries,
            payments: this.payments,
            timestamp: new Date().toISOString(),
            version: '1.0'
        };
        
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        
        const a = document.createElement('a');
        a.href = url;
        a.download = `steps-tracker-backup-${new Date().toISOString().split('T')[0]}.json`;
        a.click();
        
        URL.revokeObjectURL(url);
        this.showMessage('Backup downloaded successfully!', 'success');
    },
    
    restoreData() {
        if (!this.isAdminMode) {
            this.showMessage('Admin access required to restore data.', 'error');
            return;
        }
        
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.json';
        
        input.onchange = (e) => {
            const file = e.target.files[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = (e) => {
                    try {
                        const data = JSON.parse(e.target.result);
                        if (data.entries && data.payments !== undefined) {
                            this.entries = data.entries;
                            this.payments = data.payments;
                            this.saveData();
                            this.updateAllDisplays();
                            this.showMessage('Data restored successfully!', 'success');
                        } else {
                            this.showMessage('Invalid backup file format.', 'error');
                        }
                    } catch (error) {
                        this.showMessage('Error reading backup file.', 'error');
                    }
                };
                reader.readAsText(file);
            }
        };
        
        input.click();
    }
};

// Initialize the application when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    StepsTracker.init();
});