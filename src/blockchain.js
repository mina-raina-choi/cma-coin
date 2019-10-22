const CryptoJS = require("crypto-js"),
  hexToBinary = require("hex-to-binary")

//   블록생성주기 10초
const BLOCK_GENERATION_INTERVAL = 10
// 얼마나 자주 채굴난이도를 조절할 것인지, 비트코인은 2016블록마다
const DIFFICULTY_ADJUSTMENT_INTERVAL = 10

// 1. block 클래스 정의
class Block {
  constructor(index, hash, prevHash, timestamp, data, difficulty, nonce) {
    this.index = index
    this.hash = hash
    this.prevHash = prevHash
    this.timestamp = timestamp
    this.data = data
    this.difficulty = difficulty
    this.nonce = nonce
  }
}

// 2. genesis block은 하드코딩
// 첫번째 블록해시로 01570595637361This is the genesis!! 을 해시한 값을 넣어준다
const genesisBlock = new Block(
  0,
  "ef14c074cefb782f2170b5218ebf1122cae87e60f5f6324f0e17f4d72d1b5ea8",
  null,
  1570963704,
  "This is the genesis!!",
  0,
  0
)

let blockchain = [genesisBlock]

// console.log(blockchain);

// todo 함수형으로 작성
// 4. 가장최근 블록 가져오기
const getNewestBlock = () => blockchain[blockchain.length - 1]
// 아래함수를 ES6로 나타내면 위와 같이
// function getNewestBlock() {
//     return blockchain[blockchain.length - 1]
// }

// 5. 현재타임스탬프구하는 함수
const getTimeStamp = () => Math.round(new Date().getTime() / 1000)

const getBlockchain = () => blockchain

// 6. 해시함수
const createHash = (index, prevHash, timestamp, data, difficulty, nonce) =>
  CryptoJS.SHA256(
    index + prevHash + timestamp + JSON.stringify(data) + difficulty + nonce
  ).toString()

// 3. 함수만들기
const createNewBlock = data => {
  const prevBlock = getNewestBlock()
  const newBlockIndex = prevBlock.index + 1
  const newTimeStamp = getTimeStamp()

  const difficulty = findDifficulty()
  //   new Block 대신에 findBlock
  const newBlock = findBlock(
    newBlockIndex,
    prevBlock.hash,
    newTimeStamp,
    data,
    // how to calculate difficulty
    difficulty
  )

  addBlockToChain(newBlock)
  //   체인에 추가한 뒤 브로드캐스트
  //   상단에 import를 하면 circular dependency error발생
  // blockchain.js -> p2p.js -> blockchain.js
  require("./p2p").broadcastNewBlock()
  return newBlock
}

// 난이도 조절
const findDifficulty = () => {
  const blockchain = getBlockchain()
  const newestBlock = blockchain[blockchain.length - 1]
  // 현재블록높이가 10으로 나누어떨어지면
  if (
    newestBlock.index % DIFFICULTY_ADJUSTMENT_INTERVAL === 0 &&
    // genesis
    newestBlock.index != 0
  ) {
    //   calculate new difficulty
    return calculateNewDifficulty(newestBlock, blockchain)
  } else {
    //  현재의 난이도를 그대로 리턴
    return newestBlock.difficulty
  }
}

const calculateNewDifficulty = (newestBlock, blockchain) => {
  const lastCalculatedBlock =
    //   10 블록 전의 블록
    blockchain[blockchain.length - DIFFICULTY_ADJUSTMENT_INTERVAL]
  const timeExpected = BLOCK_GENERATION_INTERVAL * DIFFICULTY_ADJUSTMENT_INTERVAL
  // 누군가 timestamp를 조정하면 난이도를 막 조정할 수 있다. => 이상한 값을 넣으면 안되도록 유효성검증이 필요
  const timeTaken = newestBlock.timestamp - lastCalculatedBlock.timestamp
  // timeExpected = 100
  if (timeTaken < timeExpected / 2) {
    // 예상시간의 1/2보다 더 적게 걸렸으면, timeTaken < 50
    return lastCalculatedBlock.difficulty + 1
  } else if (timeTaken > timeExpected * 2) {
    // 예상시간보다 2배이상 더 걸렸으면, timeTaken > 200
    return lastCalculatedBlock.difficulty - 1
  } else {
    //   50 ~ 200 사이
    return lastCalculatedBlock.difficulty
  }
}

const findBlock = (index, prevHash, timestamp, data, difficulty) => {
  let nonce = 0
  while (true) {
    console.log(`current nonce : ${nonce}`)

    const hash = createHash(index, prevHash, timestamp, data, difficulty, nonce)

    // todo check amount of zeros
    if (hashMatchesDifficulty(hash, difficulty)) {
      return new Block(index, hash, prevHash, timestamp, data, difficulty, nonce)
    }
    nonce++
  }
}

const hashMatchesDifficulty = (hash, difficulty) => {
  // hash -> binary
  console.log("hashMatchesDifficulty", difficulty)
  const hashInBinary = hexToBinary(hash)
  const requiredZeros = "0".repeat(difficulty)
  console.log("Trying difficulty: ", difficulty, " with hash: ", hashInBinary)
  return hashInBinary.startsWith(requiredZeros)
}

// 8. 검증에 사용할 블록해시
const getBlocksHash = block =>
  createHash(
    block.index,
    block.prevHash,
    block.timestamp,
    block.data,
    block.difficulty,
    block.nonce
  )
// 9. 블록 구조 검증(각데이터의 타입검증)
const isBlockStructureValid = block => {
  return (
    typeof block.index === "number" &&
    typeof block.hash === "string" &&
    typeof block.prevHash === "string" &&
    typeof block.timestamp === "number" &&
    typeof block.data === "string"
  )
}

// 타임스탬프가 과거의 1분 ~ 미래의 1분 사이일 때 유효
const isTimeStampValid = (newBlock, oldBlock) => {
  console.log("newBlock.timestamp : ", newBlock.timestamp)
  console.log("oldBlock.timestamp : ", oldBlock.timestamp)
  console.log("getTimeStamp : ", getTimeStamp())

  return (
    //   그냥 oldBlock.timestamp < newBlock.timestamp 이면 안되나?
    // newBlock.timestamp < getTimeStamp()
    oldBlock.timestamp < newBlock.timestamp && newBlock.timestamp - 60 < getTimeStamp()
  )
}

// 7. 블록 유효성 검증
const isBlockValid = (candidateBlock, latestBlock) => {
  if (!isBlockStructureValid) {
    console.log("The candidate block structure is not valid")
    return false
  } else if (latestBlock.index + 1 !== candidateBlock.index) {
    console.log(
      "The candidate block doesn't have a valid index",
      latestBlock.index,
      candidateBlock.index
    )
    return false
  } else if (latestBlock.hash !== candidateBlock.prevHash) {
    console.log("The previousHash of the candidate block is not the hash of the latest block")
    return false
  } else if (getBlocksHash(candidateBlock) !== candidateBlock.hash) {
    console.log("The hash of this block is invalid")
    return false
  } else if (!isTimeStampValid(candidateBlock, latestBlock)) {
    console.log("The timestamp of this block is invalid")
    return false
  }
  return true
}

// todo 이 과정이 언제, 어디서, 어떻게 일어나는거지?
// todo reorg 그림에서보면 중간에 바뀌는 걸로 보이는데, 여기 코드상으로는 체인 전체가 replace?
// 10.chain valid - 들어오는 블록들이 valid한지 체크해야함, 길이가 긴 체인으로 스위칭되기도 함.
// 같은 제네시스 출신의 체인이어야함
const isChainValid = candidateChain => {
  const isGenesisValid = block => JSON.stringify(block) === JSON.stringify(genesisBlock)

  if (!isGenesisValid(candidateChain[0])) {
    console.log("The candidate chain's genesisblock is not the same as our genesisblock")
    return false
  }

  for (let i = 1; i < candidateChain.length; i++) {
    if (!isBlockValid(candidateChain[i], candidateChain[i - 1])) {
      return false
    }
  }
  return true
}

// 난이도가 추가됐으므로
// 난이도를 감안해서!! replace chain
// [3,4,4,5,6]
// difficulty를 가져와서 제곱
const sumDifficulty = anyBlockchain =>
  anyBlockchain
    .map(block => block.difficulty)
    .map(difficulty => Math.pow(2, difficulty))
    .reduce((a, b) => a + b)

// 11. 만약 새로 들어온 체인이 유효하다면 replace해주는 기능필요
const replaceChain = candidateChain => {
  if (
    isChainValid(candidateChain) &&
    sumDifficulty(candidateChain) > sumDifficulty(getBlockchain())
    // candidateChain.length > getBlockchain().length
  ) {
    blockchain = candidateChain
    return true
  } else {
    return false
  }
}

// 12. 새로운블록 체인에 추가하기
const addBlockToChain = candidateBlock => {
  if (isBlockValid(candidateBlock, getNewestBlock())) {
    getBlockchain().push(candidateBlock)
    return true
  } else {
    return false
  }
}

// http://happinessoncode.com/2018/05/20/nodejs-exports-and-module-exports/

// If you want to export a complete object in one assignment instead of building it one property at a time, assign it to module.exports
module.exports = {
  getBlockchain,
  createNewBlock,
  getNewestBlock,
  isBlockStructureValid,
  addBlockToChain,
  replaceChain
}

// exports.getBlockchain = getBlockchain;
// exports.createNewBlock = createNewBlock;
