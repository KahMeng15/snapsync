const fs = require('fs')
const path = 'src/server.ts'
let content = fs.readFileSync(path, 'utf8')

const codeToAdd = `
    socket.on('booth-enter-retake', (data: { eventId: string }) => {
      forwardToBooth(data.eventId, { type: 'enter-retake' })
    })

    socket.on('booth-update-retake', (data: { eventId: string, indices: number[] }) => {
      forwardToBooth(data.eventId, { type: 'update-retake', indices: data.indices })
    })

    socket.on('booth-cancel-retake', (data: { eventId: string }) => {
      forwardToBooth(data.eventId, { type: 'cancel-retake' })
    })
`

if (!content.includes("socket.on('booth-enter-retake'")) {
  content = content.replace("socket.on('booth-retake',", codeToAdd + "\n    socket.on('booth-retake',")
  fs.writeFileSync(path, content)
}
