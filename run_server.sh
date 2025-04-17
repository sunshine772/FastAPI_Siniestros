#!/bin/bash

PORT=8008

if lsof -i :$PORT &>/dev/null; then
  echo "El puerto $PORT ya está en uso."
  PID=$(lsof -t -i :$PORT)
  echo "Matando proceso que usa el puerto: PID $PID"
  sudo kill -9 $PID
  sleep 1
fi

echo "Levantando servidor en http://localhost:$PORT"
uvicorn app.main:app --host 0.0.0.0 --port $PORT --reload
