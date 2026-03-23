package network.fuhrmann.planning_poker

import org.springframework.boot.autoconfigure.SpringBootApplication
import org.springframework.boot.runApplication

@SpringBootApplication
class PlanningPokerApplication

fun main(args: Array<String>) {
	runApplication<PlanningPokerApplication>(*args)
}
