// ===== $PENGUIN Main Application =====

class PenguinApp {
    constructor() {
        // State
        this.isConnected = false;
        this.balance = 0;
        this.selectedWager = 0.5;
        this.game = null;
        this.prizePool = 0;
        this.killFeed = [];

        // Mock wallet (in real app, integrate Phantom/Solflare)
        this.mockWallet = {
            address: null,
            balance: 0
        };

        // DOM Elements
        this.elements = {
            connectWallet: document.getElementById('connectWallet'),
            userBalance: document.getElementById('userBalance'),
            playButton: document.getElementById('playButton'),
            gameWrapper: document.getElementById('gameWrapper'),
            gameCanvas: document.getElementById('gameCanvas'),
            exitGame: document.getElementById('exitGame'),
            snakeLength: document.getElementById('snakeLength'),
            playerRank: document.getElementById('playerRank'),
            prizePool: document.getElementById('prizePool'),
            playersOnline: document.getElementById('playersOnline'),
            totalWinnings: document.getElementById('totalWinnings'),
            caBox: document.getElementById('caBox'),
            copyCA: document.getElementById('copyCA'),
            caAddress: document.getElementById('caAddress'),
            gameConsole: document.querySelector('.game-console'),
            wagerButtons: document.querySelectorAll('.wager-btn'),
            gameHud: document.querySelector('.game-hud')
        };

        this.init();
    }

    init() {
        this.bindEvents();
        this.startLiveStats();
        this.createKillFeed();
    }

    createKillFeed() {
        // Create kill feed container
        const feed = document.createElement('div');
        feed.id = 'killFeed';
        feed.style.cssText = `
            position: fixed;
            top: 100px;
            right: 20px;
            z-index: 200;
            display: none;
            flex-direction: column;
            gap: 8px;
            max-width: 250px;
        `;
        document.body.appendChild(feed);
        this.killFeedEl = feed;
    }

    bindEvents() {
        this.elements.connectWallet.addEventListener('click', () => this.connectWallet());

        this.elements.wagerButtons.forEach(btn => {
            btn.addEventListener('click', () => {
                this.elements.wagerButtons.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                this.selectedWager = parseFloat(btn.dataset.amount);
            });
        });

        this.elements.playButton.addEventListener('click', () => this.startGame());
        this.elements.exitGame.addEventListener('click', () => this.exitGame());
        this.elements.copyCA.addEventListener('click', () => this.copyCA());

        // Modal Buttons
        document.getElementById('playAgainBtn').addEventListener('click', () => location.reload());
        document.getElementById('homeBtn').addEventListener('click', () => location.reload());
    }

    async connectWallet() {
        if (window.solana && window.solana.isPhantom) {
            try {
                const response = await window.solana.connect();
                this.mockWallet.address = response.publicKey.toString();
                this.mockWallet.balance = Math.random() * 10 + 1;
                this.isConnected = true;
                this.updateWalletUI();
                this.showNotification('Wallet connected! 🎉');
            } catch (err) {
                console.error('Wallet connection failed:', err);
                this.showNotification('Connection failed', true);
            }
        } else {
            this.mockWallet.address = 'Demo' + Math.random().toString(36).substring(2, 8);
            this.mockWallet.balance = 5.00;
            this.isConnected = true;
            this.updateWalletUI();
            this.showNotification('Demo mode activated! 🎮');
        }
    }

    updateWalletUI() {
        this.elements.userBalance.textContent = this.mockWallet.balance.toFixed(2);
        this.elements.connectWallet.innerHTML = `
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
                <polyline points="22 4 12 14.01 9 11.01"/>
            </svg>
            Connected
        `;
        this.elements.connectWallet.style.borderColor = '#00d26a';
    }

    startGame() {
        if (!this.isConnected) {
            this.showNotification('Connect your wallet first!', true);
            return;
        }

        if (this.mockWallet.balance < this.selectedWager) {
            this.showNotification('Insufficient balance!', true);
            return;
        }

        // Deduct wager
        this.mockWallet.balance -= this.selectedWager;
        this.elements.userBalance.textContent = this.mockWallet.balance.toFixed(2);

        // Prize pool
        this.prizePool = this.selectedWager * 5 * 0.9;
        this.elements.prizePool.textContent = this.prizePool.toFixed(2) + ' SOL';

        // Show game fullscreen - hide all UI
        document.body.classList.add('game-active');
        this.elements.gameConsole.classList.add('game-active');
        this.elements.gameWrapper.classList.add('active');
        this.killFeedEl.style.display = 'flex';

        // Initialize game
        this.game = new SlitherGame(this.elements.gameCanvas);
        this.game.setWager(this.selectedWager);
        this.startTime = Date.now();

        // Callbacks
        this.game.onScoreUpdate = (score) => {
            this.elements.snakeLength.textContent = score;
        };

        this.game.onRankUpdate = (rank) => {
            this.elements.playerRank.textContent = '#' + rank;
        };

        this.game.onKill = (name, wager) => {
            this.showKillFeed(name, wager);
        };

        this.game.onWagerUpdate = (earnings) => {
            const earningsHud = document.getElementById('earningsHud');
            if (earnings > 0 && earningsHud) {
                earningsHud.style.display = 'flex';
            }
            this.elements.prizePool.textContent = `+${earnings.toFixed(2)} SOL`;
        };

        this.game.onGameOver = (score, cashedOut, earnings) => {
            this.handleGameOver(score, cashedOut, earnings);
        };

        this.game.start();
        this.showNotification('🐧 Hunt for penguins! Take their wagers!');
    }

    showKillFeed(name, wager) {
        const msg = document.createElement('div');
        msg.style.cssText = `
            background: rgba(0, 210, 106, 0.9);
            color: #fff;
            padding: 10px 15px;
            border-radius: 8px;
            font-weight: 600;
            font-size: 14px;
            animation: slideIn 0.3s ease;
            box-shadow: 0 4px 15px rgba(0, 210, 106, 0.4);
        `;
        msg.textContent = `💀 Killed ${name} +${wager.toFixed(2)} SOL`;
        this.killFeedEl.appendChild(msg);

        setTimeout(() => msg.remove(), 4000);
    }

    exitGame() {
        if (this.game) {
            this.game.handleCashOut();
        }
    }

    handleGameOver(score, cashedOut, earnings) {
        if (this.game) {
            this.game.stop();
        }

        const totalReturn = cashedOut ? (this.selectedWager + earnings) * 0.9 : 0;
        const profit = totalReturn - this.selectedWager;
        const won = cashedOut && totalReturn > 0;

        if (won) {
            this.mockWallet.balance += totalReturn;
            this.elements.userBalance.textContent = this.mockWallet.balance.toFixed(2);
            if (profit > 0) this.addWinner('You', profit);
        }

        const timeSurvived = Math.floor((Date.now() - this.startTime) / 1000);
        const kills = (this.game && this.game.player) ? (this.game.player.killCount || 0) : 0;
        const multiplier = this.selectedWager > 0 ? (totalReturn / this.selectedWager).toFixed(2) : '0.00';

        const potentialReturn = (this.selectedWager + earnings) * 0.9;
        this.showGameModal(won, totalReturn, kills, timeSurvived, multiplier, potentialReturn);
    }

    showGameModal(won, prize, kills, time, multiplier, potential) {
        const modal = document.getElementById('gameModal');
        const title = document.getElementById('modTitle');
        const icon = document.getElementById('modIcon');
        const prizeEl = document.getElementById('modPrize');
        const labelEl = document.querySelector('.modal-prize-label');

        if (won) {
            title.textContent = 'Victory!';
            title.classList.remove('loss');
            icon.textContent = '🏆';
            if (labelEl) labelEl.textContent = 'PRIZE WON';
            prizeEl.style.color = '#00ff7f';
            prizeEl.textContent = `${prize.toFixed(2)} SOL`;
        } else {
            title.textContent = 'Eliminated!';
            title.classList.add('loss');
            icon.textContent = '☠️';
            if (labelEl) labelEl.innerHTML = `LOST <span style="opacity:0.7; font-size: 0.8em; margin-left: 5px">(HAD ${potential.toFixed(2)} SOL)</span>`;
            prizeEl.style.color = '#ff4757';
            prizeEl.textContent = '- ' + this.selectedWager.toFixed(2) + ' SOL';
        }

        document.getElementById('modTime').textContent = time + 's';
        document.getElementById('modKills').textContent = kills;
        document.getElementById('modMult').textContent = multiplier + 'x';

        modal.classList.add('active');
        this.elements.gameConsole.classList.remove('game-active'); // Un-focus game
    }

    addWinner(name, prize) {
        const list = document.getElementById('winnersList');
        const medals = ['🥇', '🥈', '🥉'];
        const existingWinners = list.querySelectorAll('.winner-item');

        const item = document.createElement('div');
        item.className = 'winner-item';
        item.innerHTML = `
            <span class="winner-name">${medals[0]} ${name}</span>
            <span class="winner-prize">+${prize.toFixed(2)} SOL</span>
        `;

        list.insertBefore(item, list.firstChild);

        if (existingWinners.length >= 5) {
            list.removeChild(list.lastChild);
        }
    }

    copyCA() {
        const ca = this.elements.caAddress.textContent;
        navigator.clipboard.writeText(ca).then(() => {
            this.showNotification('Contract address copied! 📋');
        });
    }

    startLiveStats() {
        setInterval(() => {
            const players = parseInt(this.elements.playersOnline.textContent);
            const newPlayers = players + Math.floor(Math.random() * 5) - 2;
            this.elements.playersOnline.textContent = Math.max(50, Math.min(300, newPlayers));

            const winnings = parseInt(this.elements.totalWinnings.textContent.replace(/,/g, ''));
            const newWinnings = winnings + Math.floor(Math.random() * 100);
            this.elements.totalWinnings.textContent = newWinnings.toLocaleString();
        }, 3000);
    }

    showNotification(message, isError = false) {
        const notification = document.createElement('div');
        notification.className = 'notification' + (isError ? ' error' : '');
        notification.textContent = message;
        document.body.appendChild(notification);

        setTimeout(() => notification.remove(), 3000);
    }
}

document.addEventListener('DOMContentLoaded', () => {
    window.app = new PenguinApp();
});
