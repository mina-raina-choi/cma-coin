const _ = require("lodash"),
  Transactions = require("./transactions")

const { validateTx } = Transactions

let memPool = []

// 멤풀에 있는 모든 txIns 배열로 리턴
const getTxInsInPool = memPool => {
  return _(memPool)
    .map(tx => tx.txIns)
    .flatten()
    .value()
}

// double spending check
// 멤풀에 담으려는 tx가 이미 멤풀에 있는지 체크
const isTxValidForPool = (tx, memPool) => {
  const txInsInPool = getTxInsInPool(memPool)

  // txIns : 멤풀에 있는 tx inputs
  // txIn: 추가하려는 tx input
  const isTxInAlreadyInPool = (txIns, txIn) => {
    // txIns 중에서 뒤에오는 function 조건에 맞는 경우를 찾음
    // the matched element, else undefined.
    return _.find(txIns, txInInPool => {
      return txIn.txOutIndex === txInInPool.txOutIndex && txIn.txOutId === txInInPool.txOutId
    })
  }

  for (const txIn of tx.txIns) {
    if (isTxInAlreadyInPool(txInsInPool, txIn)) {
      return false
    }
  }
  return true
}

const addToMempool = (tx, uTxOutList) => {
  if (!validateTx(tx, uTxOutList)) {
    throw Error("This tx is invalid. Will not add it to pool")
  } else if (!isTxValidForPool(tx, memPool)) {
    throw Error("This tx is not valid for the pool. Will not add it.")
  }
  memPool.push(tx)
}

module.exports = {
  addToMempool
}
