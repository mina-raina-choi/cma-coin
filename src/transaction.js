const CryptoJS = require("crypto-js"),

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
  constructor(uTxOutId, uTxOutIndex, address, amount) {
    this.uTxOutId = uTxOutId
    this.uTxOutIndex = uTxOutIndex
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

    
  return CryptoJS.SHA256(txInContent + txOutContent).toString()
}


