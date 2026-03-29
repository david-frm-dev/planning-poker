package network.fuhrmann.planning_poker.service

import network.fuhrmann.planning_poker.generated.model.*
import org.slf4j.LoggerFactory
import org.springframework.stereotype.Service
import reactor.core.publisher.Flux
import reactor.core.publisher.Sinks
import java.util.*
import java.util.concurrent.ConcurrentHashMap

@Service
class RoomService {
    private val rooms = ConcurrentHashMap<String, Room>()
    private val usersInRooms = ConcurrentHashMap<String, MutableMap<String, User>>()
    private val roomSinks = ConcurrentHashMap<String, Sinks.Many<RoomUpdate>>()
    private val issuesInRooms = ConcurrentHashMap<String, MutableMap<String, Issue>>()

    companion object {
        private val log = LoggerFactory.getLogger(RoomService::class.java)
    }

    private fun broadcast(roomId: String) {
        log.info("Broadcasting update for room $roomId")
        log.info("Current room state: ${rooms[roomId]}, users: ${usersInRooms[roomId]?.values}")
        val update = RoomUpdate(
            rooms[roomId] ?: return,
            usersInRooms[roomId]?.values?.toList() ?: emptyList(),
            issuesInRooms[roomId]?.values?.toList() ?: emptyList()
        )
        roomSinks[roomId]?.tryEmitNext(update)
    }

    fun roomExists(id: String) = rooms.containsKey(id)

    fun createRoom(id: String, name: String, deck: List<String>, calculateStats: Boolean) {
        rooms[id] = Room(UUID.fromString(id), name, deck, false, calculateStats)
        usersInRooms[id] = ConcurrentHashMap()
        issuesInRooms[id] = ConcurrentHashMap()
        roomSinks[id] = Sinks.many().multicast().directBestEffort()
    }

    fun joinRoom(roomId: String, user: User) {
        val existing = usersInRooms[roomId]?.get(user.id.toString())
        val stored = if (existing != null && user.vote == null) user.copy(vote = existing.vote) else user
        usersInRooms[roomId]?.put(user.id.toString(), stored)
        broadcast(roomId)
    }

    fun leaveRoom(roomId: String, userId: String) {
        usersInRooms[roomId]?.remove(userId)
        broadcast(roomId)
    }

    fun castVote(roomId: String, userId: String, vote: String?) {
        val users = usersInRooms[roomId] ?: return
        val user = users[userId] ?: return
        users[userId] = user.copy(vote = vote)
        broadcast(roomId)
    }

    fun toggleCards(roomId: String, revealed: Boolean) {
        rooms.compute(roomId) { _, room -> room?.copy(cardsRevealed = revealed) }
        broadcast(roomId)
    }

    fun resetRound(roomId: String) {
        rooms.compute(roomId) { _, room -> room?.copy(cardsRevealed = false) }
        usersInRooms[roomId]?.replaceAll { _, user -> user.copy(vote = null) }
        broadcast(roomId)
    }

    fun getEventStream(roomId: String): Flux<RoomUpdate> {
        val sink = roomSinks[roomId] ?: return Flux.error(Exception("Room not found"))
        val room = rooms[roomId] ?: return Flux.error(Exception("Room not found"))

        val currentState = RoomUpdate(
            room, usersInRooms[roomId]?.values?.toList() ?: emptyList(),
            issuesInRooms[roomId]?.values?.toList() ?: emptyList()
        )

        return Flux.concat(Flux.just(currentState), sink.asFlux())
    }

    fun addIssue(roomId: String, title: String, link: String?) {
        val issues = issuesInRooms[roomId] ?: return
        val id = UUID.randomUUID().toString()
        issues[id] = Issue(
            id = UUID.fromString(id),
            title = title,
            link = link,
            status = Issue.Status.pending
        )
        broadcast(roomId)
    }

    fun startIssueVoting(roomId: String, issueId: String) {
        val issues = issuesInRooms[roomId] ?: return

        issues.replaceAll { _, issue ->
            if (issue.status == Issue.Status.voting)
                issue.copy(status = Issue.Status.pending)
            else issue
        }

        issues.compute(issueId) { _, issue ->
            issue?.copy(status = Issue.Status.voting)
        }

        usersInRooms[roomId]?.replaceAll { _, user -> user.copy(vote = null) }
        rooms.compute(roomId) { _, room -> room?.copy(cardsRevealed = false) }

        broadcast(roomId)
    }

    fun finishIssueVoting(roomId: String, issueId: String, finishedIssueRequest: FinishIssueRequest) {
        val issues = issuesInRooms[roomId] ?: return
        issues.compute(issueId) { _, issue ->
            issue?.copy(
                status = Issue.Status.done,
                average = finishedIssueRequest.average,
                agreedAverage = finishedIssueRequest.agreedAverage
            )
        }
        broadcast(roomId)
    }

    fun getIssues(roomId: String): List<Issue> {
        return issuesInRooms[roomId]?.values?.toList() ?: emptyList()
    }
}
