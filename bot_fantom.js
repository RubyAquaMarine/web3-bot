const { getAddress } = require('@ethersproject/address');
const ethers = require('ethers');
const routerABI = require('./abi/spooky_router.json');
const erc20ABI = require('./abi/erc20.json');
const credentials = require('./config/config.json');

const provider = new ethers.providers.JsonRpcProvider(credentials.rpc.fantom);

const privateKey = credentials.account.privateKey;

const publicAddress = credentials.account.publicAddress;

const wallet = new ethers.Wallet(privateKey);
// creates the Signer abstract class => into the Signer client
// using one of the following  Wallet, VoidSigner, JsonRpcSigner
const account = wallet.connect(provider);

const timerSpeed = credentials.tools.m1;

const routerContract = new ethers.Contract(credentials.spookyswap.router, routerABI, account);

const fromToken = credentials.swap.fromAddress;

const toToken = credentials.swap.toAddress;

const fromContract = new ethers.Contract(credentials.swap.fromAddress, erc20ABI, account);

/*
working
    - Check the allowance amount given to the router
    - Increase the allowance if necessary
    - Function should be checked before each swap to ensure the transaction can go through (refactor later)
*/

async function doApproval() {

    const weiAmount = ethers.utils.parseUnits(credentials.swap.amount, 'ether');

    let allowanceAmount = await fromContract.allowance(publicAddress, credentials.spookyswap.router);

    console.log("Router Contract Allowance: " + allowanceAmount.toString(), allowanceAmount);

    if (allowanceAmount.toString() == "0" || weiAmount.toString() >= allowanceAmount.toString()) {

        console.log("Router Contract Needs Increased Allowance: ");

        const increase = weiAmount.mul(10);

        const parse = await fromContract.approve(credentials.spookyswap.router, increase);

        const receipt = await parse.wait();

        console.log("Router Contract Result: ", receipt);
    }
}



async function doStuff() {

    //Provider 
    const blockNumber = await provider.getBlockNumber();

    const balance = await provider.getBalance(publicAddress);

    const gas_try = await provider.getGasPrice();

    const blockData = await provider.getBlock(blockNumber);

    const expiryDate = ethers.BigNumber.from(blockData.timestamp + 23600);

    console.log(" BlockNumber: " + blockNumber + " Balance: " + balance + " GasPrice: " + gas_try.toString() + "\nExpires: " + expiryDate + " | Time: " + blockData.timestamp);

    //Signer 
    const address = await account.getAddress();

    const nonce = await account.getTransactionCount("latest");

    console.log(" My Wallet Address: " + address + " TransactionCount: " + nonce);

    let decimalDigit = await fromContract.decimals();

    const originalAmount = credentials.swap.amount;

    // let try_new = ethers.utils.formatUnits(originalAmount, 6);// 1 turns into 0.000001

    const weiAmount = ethers.utils.parseUnits(originalAmount, decimalDigit);
    // const weiAmount = ethers.utils.parseUnits(originalAmount, 'ether');

    const price_try = await routerContract.getAmountsOut(weiAmount, [fromToken, toToken]);

    const amountOut = price_try[1].sub(price_try[1].div(10));// 10% slippage

    let try_string = gas_try.toString();

    console.log("AmountsINN: ", weiAmount.toString());
    console.log("AmountsOUT: ", amountOut.toString());

    var swap_tx = '';


    if (credentials.swap.type == 'A') {
        swap_tx = await routerContract.swapExactETHForTokens(
            amountOut,// amountOutMin
            [fromToken, toToken],
            publicAddress,
            expiryDate,

            {
                "gasPrice": try_string,
                "gasLimit": "280000",
                "nonce": nonce,
                "value": weiAmount
            }

        ).then(result => {
            // result is another promise =. deal with it 
            let out = result.wait().then(ok => {
                console.log("Result: ", ok);
            }).catch(err => {
                console.log("Result Error: ", err);
            });
        }).catch(err => {
            console.log("Processing Error: ", err);
        });
        //   let receipt = await swap_tx.wait(); // wait for 1 block
        //   console.log("SwapReceipt: ", receipt); // sanity check
    }

    if (credentials.swap.type == 'B') {
        swap_tx = await routerContract.swapExactTokensForETH(
            weiAmount,// amountIn
            amountOut,// amountOutMin
            [fromToken, toToken],
            publicAddress,
            expiryDate,

            {
                "gasPrice": try_string,
                "gasLimit": "280000",
                "nonce": nonce,
            }

        ).then(result => {
            // result is another promise =. deal with it 
            let out = result.wait().then(ok => {
                console.log("Result: ", ok);
            }).catch(err => {
                console.log("Result Error: ", err);
            });
        }).catch(err => {
            console.log("Processing Error: ", err);
        });
        //   let receipt = await swap_tx.wait(); // wait for 1 block
        //   console.log("SwapReceipt: ", receipt); // sanity check
    }

    if (credentials.swap.type == 'C') {
        swap_tx = await routerContract.swapExactTokensForTokens(
            weiAmount,// amountIn
            amountOut,// amountOuMin
            [fromToken, toToken],
            publicAddress,
            expiryDate,

            {
                "gasPrice": try_string,
                "gasLimit": "280000",
                "nonce": nonce
            }

        ).then(result => {
            // result is another promise =. deal with it 
            let out = result.wait().then(ok => {
                console.log("Result: ", ok);
            }).catch(err => {
                console.log("Result Error: ", err);
            });
        }).catch(err => {
            console.log("Processing Error: ", err);
        });
        //   let receipt = await swap_tx.wait(); // wait for 1 block
        //   console.log("SwapReceipt: ", receipt); // sanity check
    }

    if (credentials.swap.type == 'D') {
        swap_tx = await routerContract.swapTokensForExactTokens(
            amountOut,// amountOut
            weiAmount,// amountInMax
            [fromToken, toToken],
            publicAddress,
            expiryDate,

            {
                "gasPrice": try_string,
                "gasLimit": "280000",
                "nonce": nonce
            }

        ).then(result => {
            // result is another promise =. deal with it 
            let out = result.wait().then(ok => {
                console.log("Result: ", ok);
            }).catch(err => {
                console.log("Result Error: ", err);
            });
        }).catch(err => {
            console.log("Processing Error: ", err);
        });
        //  let receipt = await swap_tx.wait(); // wait for 1 block
        //  console.log("SwapReceipt: ", receipt); // sanity check
    }


};


function run() {
    console.log("Bot is running... after timerSpeed expires, the bot will perform an action");
    doApproval();
    setInterval(doStuff, timerSpeed);
};

run();

