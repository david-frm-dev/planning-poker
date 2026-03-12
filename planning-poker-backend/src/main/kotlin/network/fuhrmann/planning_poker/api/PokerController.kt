package network.fuhrmann.planning_poker.api

import network.fuhrmann.planning_poker.service.Room
import network.fuhrmann.planning_poker.service.User
import network.fuhrmann.planning_poker.service.RoomService
import network.fuhrmann.planning_poker.service.RoomUpdate
import org.springframework.http.MediaType
import org.springframework.web.bind.annotation.*
import reactor.core.publisher.Flux
import reactor.core.publisher.Mono
import kotlin.uuid.*

@ExperimentalUuidApi
@RestController
@RequestMapping("/api/rooms")
@CrossOrigin // Erlaubt Anfragen vom Angular-Dev-Server (Port 4200)
class PokerController(private val roomService: RoomService) {

    data class CreateRoomRequest(val name: String, val deck: List<String>)
    data class VoteRequest(val userId: String, val vote: String?)
    data class ToggleRequest(val revealed: Boolean)
    data class LeaveRequest(val userId: String)

    @GetMapping("/{id}/exists")
    fun checkRoomExists(@PathVariable id: String): Mono<Boolean> {
        return Mono.just(roomService.roomExists(id))
    }

    @PostMapping
    fun createRoom(@RequestBody req: CreateRoomRequest): Mono<String> {
        val roomId = Uuid.random()
        roomService.createRoom(roomId.toString(), req.name, req.deck)
        return Mono.just(roomId.toString())
    }

    @PostMapping("/{id}/join")
    fun joinRoom(@PathVariable id: String, @RequestBody user: User): Mono<Void> {
        roomService.joinRoom(id, user)
        return Mono.empty()
    }

    @PostMapping("/{id}/vote")
    fun castVote(@PathVariable id: String, @RequestBody req: VoteRequest): Mono<Void> {
        roomService.castVote(id, req.userId, req.vote)
        return Mono.empty()
    }

    @PostMapping("/{id}/toggle")
    fun toggleCards(@PathVariable id: String, @RequestBody req: ToggleRequest): Mono<Void> {
        roomService.toggleCards(id, req.revealed)
        return Mono.empty()
    }

    @PostMapping("/{id}/reset")
    fun resetRound(@PathVariable id: String): Mono<Void> {
        roomService.resetRound(id)
        return Mono.empty()
    }

    @PostMapping("/{id}/leave")
    fun leaveRoom(@PathVariable id: String, @RequestBody req: LeaveRequest): Mono<Void> {
        roomService.leaveRoom(id, req.userId)
        return Mono.empty()
    }

    /**
     * Der wichtigste Endpunkt: Hier "hängt" das Frontend per EventSource (SSE) dran.
     * Jedes Mal, wenn im Service 'broadcast()' aufgerufen wird, schickt dieser
     * Stream ein neues JSON-Objekt an alle Clients in diesem Raum.
     */
    @GetMapping("/{id}/updates", produces = [MediaType.TEXT_EVENT_STREAM_VALUE])
    fun getRoomUpdates(@PathVariable id: String): Flux<RoomUpdate> {
        return roomService.getEventStream(id)
    }
}