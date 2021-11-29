# config 
rename config copy.json to config.json (add private key)
- privateKey ,rpc,contract addresses ,etc
- swap.type A,B,C, D
Only Swap type A is working on master branch (web3).  aka swapExactETHForTokens.  Moving on to Ethers.js , branch ethers

# Todo 
- fix swap.type C + D

# Agenda
- Size: pool reserves vs the effect of the position size => slippage => price movement. Take swaps large enough to make the price move at internals. Such as every 1 to 5 minutes. 
- Execution: M1, 14 swaps(buying x asset) , then 5 swaps(selling x asset), create HH.HL price structure. 
- Simplify: automate the contract Token Decimals (math fuckery) USDC (6) and Most (18)

# learning 
- deadline : if this value is incorrect, the transactions will be reverted by the EVM

# cannot estimate gas
When you run contract.myTransaction(...), ethers js does 2 rpcalls to node internally:

Makes an estimate gas rpcall to the node. If call reverts you will get error cannot estimate gas that you are getting. (I don't think a gas estimate requires to have enough eth at an address)
Since estimation was successful, it signs tx and sends to the node. If funds are not present, the node returns an error result, which ethers js throws as insufficient funds
