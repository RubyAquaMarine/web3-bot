# config 
- rename config copy.json to config.json
- add privateKey ,rpc,contract addresses ,etc to config if needed
- swap.type A,B,C,D
- swap.type C for Ruby.Exchange

# Progress
- swap A,B,C,D : work on fantom (using Type C on ruby)
- swap eth -> usdt,usdp,usdc : working
- swap usdt,usdp,usdc -> eth : working
- call data once, store data, reuse data in ongoing swaps 
- Simplify: automate the contract Token Decimals

# Agenda
- Size: pool reserves vs the effect of the position size => slippage => price movement. Take swaps large enough to make the price move at internals. Such as every 1 to 5 minutes. 
- Execution: M1, 14 swaps(buying x asset) , then 5 swaps(selling x asset), create HH.HL price structure. 

