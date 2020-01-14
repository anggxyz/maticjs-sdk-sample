# maticjs-sdk-sample

## Config
Enter network name and version in `./config`
eg.,

```
{
    "network":"testnet",
    "version": "v2",

    "privateKey1": "0x9Cd...",
    "privateKey2": "0xAa2e...",

    "RootTokenAddress": "", // optional; default: mapped test token ref: `github.com/maticnetwork/static`
    "ChildTokenAddress": "", // optional; default: mapped test token ref: `github.com/maticnetwork/static`
    "value": "" // optional; default: 1
}
```

network names, versions, corresponding folder:
|name|version||
|-|-|-|
|`beta`|`v2`|`beta`|
|`testnet`|`v3`|`beta`|
|`testnet`|`v2`|`alpha`|
|`alpha`|`v1`|`alpha`|

## Usage

* clone repository, 
```
$ git clone https://nglglhtr/maticjs-sdk-sample
$ cd maticjs-sdk-sample
```

* install dependencies,
```
$ npm i
```

* edit config
```
{
    "network":"testnet",
    "version": "v2",

    "privateKey1": "0x9Cd...",
    "privateKey2": "0xAa2e...",

    "RootTokenAddress": "",
    "ChildTokenAddress": "", 
    "value": "" 
}
```
* `cd` into specific folder 

```
$ cd alpha
```
and run:
```
$ node erc20
```
the script will perform, deposit from acc1, transfer (acc1 -> acc2) and will initiate withdraw from acc2

next, run
```
$ node complete-withdraw
```