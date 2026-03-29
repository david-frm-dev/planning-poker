package network.fuhrmann.planning_poker.api

import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.asFlow
import network.fuhrmann.planning_poker.generated.api.IssuesApi
import network.fuhrmann.planning_poker.generated.api.RoomsApi
import network.fuhrmann.planning_poker.generated.api.UsersApi
import network.fuhrmann.planning_poker.generated.model.*
import network.fuhrmann.planning_poker.service.RoomService
import org.springframework.http.MediaType
import org.springframework.http.ResponseEntity
import org.springframework.web.bind.annotation.*
import reactor.core.publisher.Flux
import java.util.*

@RestController
@RequestMapping("/api")
@CrossOrigin // Erlaubt Anfragen vom Angular-Dev-Server (Port 4200)
class PokerController(private val roomService: RoomService) : RoomsApi, UsersApi, IssuesApi {

    override suspend fun checkRoomExists(id: UUID): ResponseEntity<RoomExistsResponse> {
        return ResponseEntity.ok(RoomExistsResponse(exists = roomService.roomExists(id.toString())))
    }

    override suspend fun createRoom(createRoomRequest: CreateRoomRequest): ResponseEntity<CreateRoomResponse> {
        val roomId = UUID.randomUUID()
        roomService.createRoom(roomId.toString(), createRoomRequest.name, createRoomRequest.deck, createRoomRequest.calculateStats)
        return ResponseEntity.ok(CreateRoomResponse(roomId = roomId))
    }

    override suspend fun joinRoom(id: UUID, user: User): ResponseEntity<SuccessResponse> {
        roomService.joinRoom(id.toString(), user)
        return ResponseEntity.ok(SuccessResponse(success = true))
    }

    override suspend fun castVote(id: UUID, voteRequest: VoteRequest): ResponseEntity<SuccessResponse> {
        roomService.castVote(id.toString(), voteRequest.userId, voteRequest.vote)
        return ResponseEntity.ok(SuccessResponse(success = true))
    }

    override suspend fun toggleCards(id: UUID, toggleRequest: ToggleRequest): ResponseEntity<SuccessResponse> {
        roomService.toggleCards(id.toString(), toggleRequest.revealed)
        return ResponseEntity.ok(SuccessResponse(success = true))
    }

    override suspend fun resetRound(id: UUID): ResponseEntity<SuccessResponse> {
        roomService.resetRound(id.toString())
        return ResponseEntity.ok(SuccessResponse(success = true))
    }

    override suspend fun leaveRoom(id: UUID, leaveRequest: LeaveRequest): ResponseEntity<SuccessResponse> {
        roomService.leaveRoom(id.toString(), leaveRequest.userId)
        return ResponseEntity.ok(SuccessResponse(success = true))
    }

    /**
     * Der wichtigste Endpunkt: Hier "hängt" das Frontend per EventSource (SSE) dran.
     * Jedes Mal, wenn im Service 'broadcast()' aufgerufen wird, schickt dieser
     * Stream ein neues JSON-Objekt an alle Clients in diesem Raum.
     */
    @GetMapping("/rooms/{id}/updates", produces = [MediaType.TEXT_EVENT_STREAM_VALUE])
    fun getRoomUpdates(@PathVariable id: String): Flux<RoomUpdate> {
        return roomService.getEventStream(id)
    }

    override suspend fun addIssue(
        id: UUID,
        addIssueRequest: AddIssueRequest
    ): ResponseEntity<SuccessResponse> {
        roomService.addIssue(id.toString(), addIssueRequest.title, addIssueRequest.link)
        return ResponseEntity.ok(SuccessResponse(success = true))
    }

    override suspend fun finishIssueVoting(
        id: UUID,
        issueId: UUID,
        finishIssueRequest: FinishIssueRequest
    ): ResponseEntity<SuccessResponse> {
        roomService.finishIssueVoting(id.toString(), issueId.toString(), finishIssueRequest)
        return ResponseEntity.ok(SuccessResponse(success = true))
    }

    override fun getIssues(id: UUID): ResponseEntity<Flow<Issue>> {
        val issues = roomService.getIssues(id.toString())
        return ResponseEntity.ok(issues.asFlow())
    }

    override suspend fun startIssueVoting(
        id: UUID,
        issueId: UUID
    ): ResponseEntity<SuccessResponse> {
        roomService.startIssueVoting(id.toString(), issueId.toString())
        return ResponseEntity.ok(SuccessResponse(success = true))
    }
}
