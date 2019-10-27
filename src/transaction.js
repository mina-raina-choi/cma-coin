const CryptoJS = require("crypto-js"),
  EC = require("elliptic").ec

const ec = new EC("secp256k1")

class TxOut {
  constructor(address, amount) {
    this.address = address
    this.amount = amount
  }
}

// utxo : 아직 사용하지 않은 아웃풋
class TxIn {
  // uTxOutId
  // uTxOutIndex
  // signature
}

class Transaction {
  // id
  // txIns[]
  // txOuts []
}

class UTxOut {
  constructor(txOutId, txOutIndex, address, amount) {
    // txid
    this.txOutId = txOutId
    // vout
    this.txOutIndex = txOutIndex
    this.address = address
    this.amount = amount
  }
}

const uTxOuts = []

const getTxId = tx => {
  // 인풋의 id + index를 가져와서 문자열을 계속 합쳐준다.
  const txInContent = tx.txIns
    .map(txIn => txIn.uTxOutId + txIn.uTxOutIndex)
    .reduce((a, b) => a + b, "")

  // 아웃풋의 address, amount를 계속 합쳐준다.
  const txOutContent = tx.txOuts
    .map(txOut => txOut.address + txOut.amount)
    .reduce((a, b) => a + b, "")

  // 트랜잭션 데이터를 해시한 값 = txid
  return CryptoJS.SHA256(txInContent + txOutContent).toString()
}

// utxo를 갖고 있는지 체크
const findUTxOut = (txOutId, txOutIndex, uTxOutList) => {
  return uTxOutList.find(uTxOut => uTxOut.txOutId === txOutId && uTxOut.txOutIndex === txOutIndex)
}

const signTxIn = (tx, txInIndex, privateKey, uTxOut) => {
  // 인풋은 여러개가 있을 수 있다. 그중에서 사용할 input을 input index를 사용해 선택
  const txIn = tx.txIns[txInIndex]
  const dataToSign = tx.id
  const referenceduTxOut = findUTxOut(txIn.txOutId, txIn.txOutIndex, uTxOuts)
  if (referenceduTxOut === null) {
    // no money
    return
  }
  // todo Sign the Txin
}
