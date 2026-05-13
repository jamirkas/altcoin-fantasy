const { ethers } = require('ethers');

async function main() {
  const provider = new ethers.JsonRpcProvider('https://sepolia.base.org');
  const address = '0x71Abf929004384d6380547a412a5aFC126F66908';
  
  const balance = await provider.getBalance(address);
  console.log('Current balance:', ethers.formatEther(balance), 'ETH');
  
  const txCount = await provider.getTransactionCount(address);
  console.log('Nonce (tx count):', txCount);
  
  const currentBlock = await provider.getBlockNumber();
  console.log('Current block:', currentBlock);
  
  // Check last 20 blocks
  for (let i = 0; i < 20; i++) {
    const blockNum = currentBlock - i;
    const block = await provider.getBlock(blockNum, true);
    if (!block || !block.transactions) continue;
    for (const hash of block.transactions) {
      const tx = await provider.getTransaction(hash);
      if (!tx) continue;
      const fromMatch = tx.from?.toLowerCase() === address.toLowerCase();
      const toMatch = tx.to?.toLowerCase() === address.toLowerCase();
      if (fromMatch || toMatch) {
        const dir = fromMatch ? 'OUT' : 'IN ';
        console.log(`Block ${blockNum}: ${hash.slice(0,10)}... ${dir} to=${tx.to?.slice(0,16)}... val=${ethers.formatEther(tx.value || 0)} ETH gas=${tx.gasPrice?.toString()}`);
      }
    }
  }
}

main().catch(e => console.error(e));
