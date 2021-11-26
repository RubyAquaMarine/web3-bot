# config 
rename config copy.json to config.json (add private key)
- privateKey ,rpc,contract addresses ,etc
- swap.type A,B,C
Only Swap type A is working.  aka swapExactETHForTokens

# Todo 
- fix swap.type B and C

# Agenda
- pool reserves vs the effect of the position size => slippage => price movement. Take swaps large enough to make the price move at internals. Such as every 1 to 5 minutes. 
- M1, 14 swaps(buying x asset) , then 5 swaps(selling x asset), create HH.HL price structure. 

# learning 
- deadline : if this value is incorrect, the transactions will be reverted by the EVM
