# Tutorial: Write and interact with your first Aztec.nr contract

<aside>
💡 This is primarily aimed towards developers coming from Ethereum and utilizes the sandbox. There is a limited assumed knowledge of zk, but there are pieces throughout to encourage zk devs. 

If we are using this to run workshops, we will have to edit slightly depending on our audience.
</aside>

In this tutorial, we will write, compile, deploy, and interact with an Aztec.nr smart contract. You do not need any experience with Aztec or Noir, but it will help to have some basic blockchain knowledge. You’ll learn how to:

1. Set up a new Aztec.nr project with Nargo
2. Write a private transferrable token contract
3. Program privacy into Aztec smart contracts in general
4. Deploy your contract using Aztec.js
5. Interact with your contract using Aztec.js

Before following this tutorial, please make sure you have [installed the sandbox](https://sandbox.aztec.network/).

# Contract

This tutorial is divided into two parts - the contract and the node app. If you’d like to skip to the Aztec.js part, you can find the full smart contract [here](https://github.com/catmcgee/aztecnr-private-token-example/blob/main/contracts/private_token_contract/src/main.nr).

## Starting a project

Run the [sandbox](https://aztec-docs-dev.netlify.app/dev_docs/getting_started/sandbox) using either Docker or npm. 

Docker

```rust
/bin/bash -c "$(curl -fsSL 'https://sandbox.aztec.network')"
```

npm

```rust
npx @aztec/aztec-sandbox
```

### Install dependencies

You will need to install nargo, the Noir build tool. If you are familiar with Rust, this is similar to cargo. 

```bash
curl -L https://raw.githubusercontent.com/noir-lang/noirup/main/install | bash
noirup -v aztec
```

This command ensures that you are on the `aztec` version of noirup, which is what we need to compile and deploy [aztec.nr](http://aztec.nr) smart contracts.

### Create a project

Create a new directory called `aztec-private-token` 

```bash
mkdir aztec-private-token
```

then create a `contracts` folder inside where our [aztec.nr](http://aztec.nr) contract will live:

```bash
cd aztec-private-token
mkdir contracts
```

Inside `contracts`, create a new Noir project using nargo:

```bash
cd contracts
nargo new private_token_contract 
```

Your file structure should look like this:

```bash
aztec-private-token
|-contracts
| |--private_token_contract
| |  |--src
| |  |  |--main.nr
| |  |Nargo.toml
```

The file `[main.nr](http://main.nr)` will soon turn into our smart contract!

Go to the generated file `Nargo.toml` and replace it with this:

```bash
[package]
name = "private_token"
type = "contract"
authors = [""]
compiler_version = "0.11.1"

[dependencies] 
aztec = { git="https://github.com/AztecProtocol/aztec-packages", tag="master", directory="yarn-project/noir-libs/aztec-noir" }
value_note = { git="https://github.com/AztecProtocol/aztec-packages", tag="master", directory="yarn-project/noir-libs/value-note"}
easy_private_state = { git="https://github.com/AztecProtocol/aztec-packages", tag="master", directory="yarn-project/noir-libs/easy-private-state"}
```

This the type as `contract` and adds the dependencies we need to create a private token smart contract.

# Writing a smart contract

 In this section, we will learn how to write a private transferrable token smart contract. 

In this contract, the identity of the sender and recipient, the amount being transferred, and the initial supply of tokens are kept private and only disclosed to the parties involved. 

### Step 1: Define the functions needed

Go to `[main.nr](http://main.nr)` and replace the code with this contract and functions:

```rust
contract PrivateToken {
    #[aztec(private)]
    fn constructor(initial_supply: Field, owner: Field) {}

    #[aztec(private)]
    fn mint(amount: Field, owner: Field) {}

    #[aztec(private)]
    fn transfer(amount: Field, recipient: Field) {}

    unconstrained fn getBalance(owner: Field) -> Field {
        0
    }
}
```

This code defines a contract called `PrivateToken` with four functions that we will implement later - a `constructor` which is called when the contract is deployed, `mint`, `transfer`, and `getBalance`.

 We have annotated the functions with `#[aztec(private)]` which are ABI macros so the compiler understands it will handle private inputs. 

The `getBalance` function doesn’t need this as it will only be reading from the chain, not updating state, similar to a `view` function in Solidity. This is what `unconstrained` means.

### Step 2. Privately store contract state

In this step, we will initiate a `Storage` struct to store balances in a private way. Write this within your contract at the top.

```rust
   use dep::std::option::Option;
    use dep::value_note::{
        balance_utils,
        utils::{increment, decrement},
        value_note::{VALUE_NOTE_LEN, ValueNote, ValueNoteMethods},
    };
    use dep::aztec::{
        context::{PrivateContext, PublicContext, Context},
        note::{
            note_header::NoteHeader,
            utils as note_utils,
        },
        state_vars::{map::Map, set::Set},
    };

    struct Storage {
        // maps an aztec address to its balance
        balances: Map<Set<ValueNote, VALUE_NOTE_LEN>>,
    }
// rest of the functions

```

**What are these new dependencies?**

`context::{PrivateContext, Context}`
Context gives us access to the environment information such as `msg.sender`. We are also importing `PrivateContext` to access necessary information for our private functions. We’ll be using it in the next step. 

`state_vars::{map::Map, set::Set}` 

Map is a state variable that functions like a dictionary, relating Fields to other state variables. A Set is specifically used for managing multiple notes.

`value_note::{VALUE_NOTE_LEN, ValueNote, ValueNoteMethods}`

Notes are fundamental to how Aztec manages privacy. A note is a privacy-preserving representation of an amount of tokens associated with an address, while encrypting the amount and owner. In this contract, we are using the `value_note` library.

From the `value_note` library we are using `ValueNote` which is a type of note interface for storing a single Field, eg a balance, `VALUE_NOTE_LEN` which is a global const of 3 acting as the length of a ValueNote, and `ValueNoteMethods` which is a collection of functions for operating on a ValueNote.

Now we’ve got that out of the way, let’s create an init method for our Storage struct:

```rust
impl Storage {
        fn init(context: Context) -> pub Self {
            Storage {
                balances: Map::new(
                    context,
                    1, // Storage slot
                    |context, slot| {
                        Set::new(context, slot, ValueNoteMethods)
                    },
                ),
            }
        }
    }
```

This `init` method is creating and initializing a `Storage` instance. This instance includes a `Map` named `balances`. Each entry in this `Map` represents an account's balance.

When the `Map` is created, it is populated with a `Set` of `ValueNote` for each slot (representing each address). The `Set` contains all `ValueNote` entries (private balances) corresponding to that address. The `init` method uses the given `Context` to correctly set up this initial state.

### Step 3: Keeping balances private

Now we’ve got a mechanism for storing our private state, we can start using it to ensure the privacy of balances.

Let’s create a `constructor` method to run on deployment that assigns an initial supply of tokens to a specified owner. In the constructor we created in the first step, write this:

```rust
#[aztec(private)]
    fn constructor(
        initial_supply: Field, 
        owner: Field
    )  {
        let storage = Storage::init(Context::private(&mut context)); // Initialize Storage struct with the private context
        let owner_balance = storage.balances.at(owner);  // Access the Set of the owner's ValueNotes from the "balances" Map
        if (initial_supply != 0) {
            increment(owner_balance, initial_supply, owner); // Increase owner's supply by specified amount
        }
    }
```

Here, we are creating a private context and using this to initialize the storage struct. The function then accesses the encrypted balance of the owner from storage. Lastly, it assigns the initial supply of tokens to the owner, maintaining the privacy of the operation by working on encrypted data.

### Step 4: Transferring and minting privately

Now let’s implement the `transfer` and `mint` function we defined in the first step. In the `mint` function, write this:

```rust
#[aztec(private)]
    fn mint(
        amount: Field, 
        owner: Field
    )  {
        let storage = Storage::init(Context::private(&mut context));
        let owner_balance = storage.balances.at(owner);
        increment(owner_balance, amount, owner);
    }
```

In the mint function, we first transform our context into a private one and initialize our storage as we did in the constructor. We then access the owner's `ValueNote` Set from the `balances` Map. We then use this to increment the `owner`'s balance using the `balance_utils::increment` function to add the minted amount to the owner's balance privately.

The `transfer` function is similar. In the `transfer` function, put this:

```rust
#[aztec(private)]
    fn transfer(
        amount: Field, 
        recipient: Field,
    )  {
        let storage = Storage::init(Context::private(&mut context));
        let sender = context.msg_sender(); // set sender as msg.sender()

        let sender_balance = storage.balances.at(sender); // get the sender's balance
        decrement(sender_balance, amount, sender); // decrement sender balance by amount

        // Creates new note for the recipient.
        let recipient_balance = storage.balances.at(recipient); // get recipient's balance
        increment(recipient_balance, amount, recipient); // increment recipient balance by amount
    }
```

Here, we create a private context, initialize the storage, and set the sender as `msg.sender()`. We then get the sender’s balance, decrement it by the amount specified, and increment the recipient’s balance in the same way.  

### Step 5: Preventing double spending

Because our token transfers are private, the network can't directly verify if a note was spent or not, which could lead to double-spending. To solve this, we use a nullifier - a unique identifier generated from each spent note and its owner. 

Add a new function into your contract as shown below:

```rust
unconstrained fn compute_note_hash_and_nullifier(contract_address: Field, nonce: Field, storage_slot: Field, preimage: [Field; VALUE_NOTE_LEN]) -> [Field; 4] {
    let note_header = NoteHeader { contract_address, nonce, storage_slot };
    note_utils::compute_note_hash_and_nullifier(ValueNoteMethods, note_header, preimage)
}
```

Here, we're computing both the note hash and the nullifier. The nullifier computation uses Aztec’s `compute_note_hash_and_nullifier` function, which takes our `ValueNoteMethods` and details about the note's attributes eg contract address, nonce, storage slot, and preimage.

Aztec will use these nullifiers to track and prevent double-spending, ensuring the integrity of private transactions without us having to explicitly program a check within smart contract functions.

### Step 6: Getting an encrypted balance

The last thing we need to implement which will help us test our contract is the getBalance function. in the `getBalance` we defined in the first step, write this:

```rust
unconstrained fn getBalance(owner: Field) -> Field {
    let context = Context::none();
    let storage = Storage::init(context);
    let owner_notes = storage.balances.at(owner);
    balance_utils::get_balance(owner_notes)
}
```

In this function, we initialize our storage with no context as it is not required. This allows us to fetch data from storage without a transaction. We retrieve a reference to the `owner`'s `ValueNote` Set from the `balances` Map. The `get_balance` function then operates on the owner's `ValueNote` Set. This processes the set of `ValueNote`s to yield a private and encrypted balance that only the private key owner can decrypt.

# TODO: Interacting with a contract using Aztec.js

you can compile, deploy and call functions from sandbox, and also aztec.js

### Setting up a project

### Compile and deploy your token contract

### Get balance

### Transfer a token