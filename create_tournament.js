const { ethers } = require('ethers');
const fs = require('fs');

async function main() {
  const deployment = JSON.parse(fs.readFileSync('/root/altcoin-fantasy/deployment.json', 'utf8'));
  const abi = deployment.abi;
  const address = deployment.address;
  const privateKey = '0x9313cc09dc902f15037287a8a797d0affbff172e020d4c96bdaac8cc049adc45';
  
  const provider = new ethers.JsonRpcProvider('https://sepolia.base.org');
  const wallet = new ethers.Wallet(privateKey, provider);
  
  const now = Math.floor(Date.now() / 1000);
  const deadline = now + 86400;  // 24h from now
  const endTime = deadline + 7 * 86400;  // 1 week after deadline
  
  const entryFee = ethers.parseEther('0.001');
  console.log('Entry fee:', entryFee.toString());
  console.log('Deadline:', new Date(deadline * 1000).toISOString());
  console.log('End:', new Date(endTime * 1000).toISOString());
  
  // Use raw transaction encoding to avoid ethers v6 issues
  const iface = new ethers.Interface(abi);
  const data = iface.encodeFunctionData('createTournament', [
    entryFee,
    deadline,
    endTime,
    1000
  ]);
  
  console.log('Encoded data:', data.slice(0, 66) + '...');
  
  const tx = await wallet.sendTransaction({
    to: address,
    data: data,
    gasLimit: 300000
  });
  console.log('TX hash:', tx.hash);
  const receipt = await tx.wait();
  console.log('Status:', receipt.status === 1 ? 'SUCCESS' : 'FAILED');
  
  if (receipt.status === 1) {
    console.log('✅ Tournament #1 created!');
    console.log('Block:', receipt.blockNumber);
  } else {
    console.error('❌ Transaction reverted');
  }
}

main().catch(err => console.error('FATAL:', err.shortMessage || err.message));
