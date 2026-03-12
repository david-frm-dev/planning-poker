package network.fuhrmann.planning_poker.service
import org.springframework.stereotype.Service
import reactor.core.publisher.Flux
import reactor.core.publisher.Sinks
import java.util.concurrent.ConcurrentHashMap
import org.slf4j.LoggerFactory

// --- Models ---
data class User(
    val id: String,
    val name: String,
    val role: String, // 'player' | 'viewer'
    var vote: String? = null
)

data class Room(
    val id: String,
    val name: String,
    val deck: List<String>,
    var cardsRevealed: Boolean = false
)

// Wrapper für SSE-Updates
data class RoomUpdate(
    val room: Room,
    val users: List<User>
)

@Service
class RoomService {
    private val rooms = ConcurrentHashMap<String, Room>()
    private val usersInRooms = ConcurrentHashMap<String, MutableMap<String, User>>()
    private val roomSinks = ConcurrentHashMap<String, Sinks.Many<RoomUpdate>>()

    companion object {
        private val log = LoggerFactory.getLogger(RoomService::class.java)
    }

    // Hilfsmethode: Sendet den aktuellen Stand an alle im Raum
    private fun broadcast(roomId: String) {
        log.info("Broadcasting update for room $roomId")
        log.info("Current room state: ${rooms[roomId]}, users: ${usersInRooms[roomId]?.values}")
        val update = RoomUpdate(
            rooms[roomId] ?: return,
            usersInRooms[roomId]?.values?.toList() ?: emptyList()
        )
        roomSinks[roomId]?.tryEmitNext(update)
    }

    fun roomExists(id: String) = rooms.containsKey(id)

    fun createRoom(id: String, name: String, deck: List<String>) {
        rooms[id] = Room(id, name, deck)
        usersInRooms[id] = ConcurrentHashMap()
        roomSinks[id] = Sinks.many().multicast().directBestEffort()
    }

    fun joinRoom(roomId: String, user: User) {
        usersInRooms[roomId]?.put(user.id, user)
        broadcast(roomId)
    }

    fun leaveRoom(roomId: String, userId: String) {
        usersInRooms[roomId]?.remove(userId)
        broadcast(roomId)
    }

    fun castVote(roomId: String, userId: String, vote: String?) {
        usersInRooms[roomId]?.get(userId)?.vote = vote
        broadcast(roomId)
    }

    fun toggleCards(roomId: String, revealed: Boolean) {
        rooms[roomId]?.cardsRevealed = revealed
        broadcast(roomId)
    }

    fun resetRound(roomId: String) {
        rooms[roomId]?.cardsRevealed = false
        usersInRooms[roomId]?.values?.forEach { it.vote = null }
        broadcast(roomId)
    }

    fun getEventStream(roomId: String): Flux<RoomUpdate> {
        return roomSinks[roomId]?.asFlux() ?: Flux.error(Exception("Room not found"))
    }
}