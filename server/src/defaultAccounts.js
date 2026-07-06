const ACC_COLORS = {
  cash: '#7c6af5',
  bank: '#4ade80',
  credit: '#f87171',
  ewallet: '#38bdf8',
};

const DEFAULT_ACCOUNTS = [
  { id: 'acc_1', name: '現金', type: 'cash', initialBalance: 0, color: ACC_COLORS.cash },
  { id: 'acc_2', name: '銀行存款', type: 'bank', initialBalance: 0, color: ACC_COLORS.bank },
  { id: 'acc_3', name: '信用卡', type: 'credit', initialBalance: 0, color: ACC_COLORS.credit },
  { id: 'acc_4', name: '電子支付', type: 'ewallet', initialBalance: 0, color: ACC_COLORS.ewallet },
];

module.exports = { DEFAULT_ACCOUNTS };
