import { createServer } from 'http'
import { Server } from 'socket.io'

const httpServer = createServer()

const io = new Server(httpServer, {
  cors: {
    origin: '*'
  }
})

io.on('connection', (socket) => {
  console.log('socket connected', socket.id)

  socket.on('join-tenant', (tenantId: string) => {
    socket.join(tenantId)
    console.log(`socket ${socket.id} joined tenant ${tenantId}`)
  })

  socket.on('kds:new-order', (payload) => {
    if (payload?.tenantId) {
      io.to(payload.tenantId).emit('kds:new-order', payload)
    }
  })

  socket.on('kds:update', (payload) => {
    if (payload?.tenantId) {
      io.to(payload.tenantId).emit('kds:update', payload)
    }
  })

  socket.on('kds:order-served', (payload) => {
    if (payload?.tenantId) {
      io.to(payload.tenantId).emit('kds:order-served', payload)
    }
  })

  socket.on('disconnect', () => {
    console.log('socket disconnected', socket.id)
  })
})

const PORT = process.env.SOCKET_PORT ? Number(process.env.SOCKET_PORT) : 4001

httpServer.listen(PORT, () => {
  console.log(`Socket server running on port ${PORT}`)
})
