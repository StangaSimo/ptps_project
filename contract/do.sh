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
