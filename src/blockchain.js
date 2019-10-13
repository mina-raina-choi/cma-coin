const CryptoJS = require("crypto-js");

// 1. block 클래스 정의
class Block {
  constructor(index, hash, prevHash, timestamp, data) {
    this.index = index;
    this.hash = hash;
    this.prevHash = prevHash;
    this.timestamp = timestamp;
    this.data = data;
  }
}

// 2. genesis block은 하드코딩
// 첫번째 블록해시로 01570595637361This is the genesis!! 을 해시한 값을 넣어준다
const genesisBlock = new Block(
  0,
  "dc90cc2eb3ea0dff4fcf6c0b9fe0954cb8bbe050ebee9d0402ca31551766466d",
  null,
  1570595637361,
  "This is the genesis!!"
);

let blockchain = [genesisBlock];

// console.log(blockchain);

// todo 함수형으로 작성
// 4. 가장최근 블록 가져오기
const getNewestBlock = () => blockchain[blockchain.length - 1];
// 아래함수를 ES6로 나타내면 위와 같이
// function getNewestBlock() {
//     return blockchain[blockchain.length - 1]
// }

// 5. 현재타임스탬프구하는 함수
const getTimeStamp = () => new Date().getTime() / 1000;

const getBlockchain = () => blockchain;

// 6. 해시함수
const createHash = (index, prevHash, timestamp, data) =>
  CryptoJS.SHA256(index + prevHash + timestamp + data).toString();

// 3. 함수만들기
const createNewBlock = data => {
  const prevBlock = getNewestBlock();
  const newBlockIndex = prevBlock.index + 1;
  const newTimeStamp = getTimeStamp();
  const newHash = createHash(newBlockIndex, prevBlock.hash, newTimeStamp, data);
  console.log(
    "newHAsh",
    newHash,
    newBlockIndex,
    prevBlock.hash,
    newTimeStamp,
    data
  );
  const newBlock = new Block(
    newBlockIndex,
    newHash,
    prevBlock.hash,
    newTimeStamp,
    data
  );

  addBlockToChain(newBlock);
  return newBlock;
};

// 8. 검증에 사용할 블록해시
const getBlocksHash = block =>
  createHash(block.index, block.prevHash, block.timestamp, block.data);

// 9. 블록 구조 검증(각데이터의 타입검증)
const isBlockStructureValid = block => {
  return (
    typeof block.index === "number" &&
    typeof block.hash === "string" &&
    typeof block.prevHash === "string" &&
    typeof block.timestamp === "number" &&
    typeof block.data === "string"
  );
};

// 7. 블록 유효성 검증
const isBlockValid = (candidateBlock, latestBlock) => {
  if (!isBlockStructureValid) {
    console.log("The candidate block structure is not valid");
    return false;
  } else if (latestBlock.index + 1 !== candidateBlock.index) {
    console.log(
      "The candidate block doesn't have a valid index",
      latestBlock.index,
      candidateBlock.index
    );
    return false;
  } else if (latestBlock.hash !== candidateBlock.prevHash) {
    console.log(
      "The previousHash of the candidate block is not the hash of the latest block"
    );
    return false;
  } else if (getBlocksHash(candidateBlock) !== candidateBlock.hash) {
    console.log(
      "The hash of this block is invalid",
      getBlocksHash(candidateBlock),
      candidateBlock
    );
    return false;
  }
  return true;
};

// todo 이 과정이 언제, 어디서, 어떻게 일어나는거지?
// todo reorg 그림에서보면 중간에 바뀌는 걸로 보이는데, 여기 코드상으로는 체인 전체가 replace?
// 10.chain valid - 들어오는 블록들이 valid한지 체크해야함, 길이가 긴 체인으로 스위칭되기도 함.
// 같은 제네시스 출신의 체인이어야함
const isChainValid = candidateChain => {
  const isGenesisValid = block =>
    JSON.stringify(block) === JSON.stringify(genesisBlock);

  if (!isGenesisValid(candidateChain[0])) {
    console.log(
      "The candidate chain's genesisblock is not the same as our genesisblock"
    );
    return false;
  }

  for (let i = 1; i < candidateChain.length; i++) {
    if (!isBlockValid(candidateChain[i], candidateChain[i - 1])) {
      return false;
    }
  }
  return true;
};

// 11. 만약 새로 들어온 체인이 유효하다면 replace해주는 기능필요
const replaceChain = candidateChain => {
  if (
    isChainValid(candidateChain) &&
    candidateChain.length > getBlockchain().length
  ) {
    blockchain = candidateChain;
    return true;
  } else {
    return false;
  }
};

// 12. 새로운블록 체인에 추가하기
const addBlockToChain = candidateBlock => {
  if (isBlockValid(candidateBlock, getNewestBlock())) {
    getBlockchain().push(candidateBlock);
    return true;
  } else {
    return false;
  }
};

// http://happinessoncode.com/2018/05/20/nodejs-exports-and-module-exports/

// If you want to export a complete object in one assignment instead of building it one property at a time, assign it to module.exports
module.exports = {
  getBlockchain,
  createNewBlock,
  getNewestBlock,
  isBlockStructureValid,
  addBlockToChain,
  replaceChain
};

// exports.getBlockchain = getBlockchain;
// exports.createNewBlock = createNewBlock;
