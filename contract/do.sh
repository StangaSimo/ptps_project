#!/bin/bash

usage() {
  echo "Usage: $0 {deploy|node|comp|test}"
  exit 1
}

if [ $# -lt 1 ]; then
  usage
fi

case "$1" in
  dep)
    npx hardhat ignition deploy ./ignition/modules/Lock.ts --network localhost
    ;;
  all)
    npx hardhat node &
    npx hardhat ignition deploy ./ignition/modules/Lock.ts --network localhost
    ;;
  kill)
    kill -SIGTSTP [PID]
    ;;
  nod)
    npx hardhat node
    ;;
  comp)
    npx hardhat compile
    ;;
  test)
    npx hardhat test
    ;;
  *)
    usage
    ;;
esac
